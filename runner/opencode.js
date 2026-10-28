#!/usr/bin/env node
// The agent harness: the real OpenCode CLI, headless, inside a container with the
// network it needs to reach its provider. What it writes is what gets measured.
// Zero dependencies.
//
// This is the only harness in the repo that lets a model run tools, so the
// comparison it produces is "agent writes a file" against a reference file, not
// "one completion against a reference file". The two harnesses are not the same
// experiment and the results say which one produced them.
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const TMP = path.join(ROOT, "runner", "tmp");
const OPENCODE_VERSION = "2.0.28"; // must match ARG in sandbox/Dockerfile.opencode
const IMAGE = "slopbench-opencode";
const OC = "/oc";
const DEFAULT_TIMEOUT_S = 420;

const safeEnv = () => ({ PATH: process.env.PATH || "", HOME: process.env.HOME || "" });
const uid = () => (typeof process.getuid === "function" ? process.getuid() : 1000);
const gid = () => (typeof process.getgid === "function" ? process.getgid() : 1000);

function fail(msg) {
  throw new Error(`opencode: ${msg}`);
}

// Same hardening as the grading container, except the network: an agent CLI
// cannot reach a provider without one. The credential is handed over through the
// container env by name, so it never appears in the process list or in a config
// file that is mounted into the container.
function hardened({ mounts = [], env = [] } = {}) {
  return [
    "run", "--rm",
    "--network", "bridge",
    "--memory", "1g", "--memory-swap", "1g",
    "--cpus", "1",
    "--pids-limit", "256",
    "--ulimit", "fsize=1048576",
    "--read-only",
    "--tmpfs", "/tmp:rw,size=256m,mode=1777",
    "--security-opt", "no-new-privileges",
    "--cap-drop", "ALL",
    "--user", `${uid()}:${gid()}`,
    "-e", `HOME=${OC}/home`,
    ...env,
    ...mounts,
    "-w", "/job",
  ];
}

// The provider is declared explicitly instead of relying on a login: the CLI then
// reads the key from its own env var, and the same config works for any
// OpenAI-compatible endpoint (Zen, OpenRouter, a local server).
function buildConfig({ provider, base, keyEnv, modelId }) {
  return {
    $schema: "https://opencode.ai/config.json",
    providers: {
      [provider]: {
        name: provider,
        env: [keyEnv],
        package: "@opencode/ai/providers/openai-compatible",
        settings: { baseURL: base },
        models: { [modelId]: { modelID: modelId } },
      },
    },
  };
}

// Split out from run() so the offline self-test can assert the hardening and the
// credential handling without a Docker daemon.
function opencodeArgs({ runDir, jobDir, provider, modelId, keyEnv, message, timeoutS = DEFAULT_TIMEOUT_S }) {
  const env = [
    "-e", `XDG_CONFIG_HOME=${OC}/config`,
    "-e", `XDG_DATA_HOME=${OC}/data`,
    "-e", `XDG_CACHE_HOME=${OC}/cache`,
    "-e", `XDG_STATE_HOME=${OC}/state`,
    // Bare name: docker takes the value from its own environment.
    "-e", keyEnv,
  ];
  return [
    ...hardened({ mounts: ["-v", `${jobDir}:/job`, "-v", `${runDir}:${OC}`], env }),
    IMAGE,
    "timeout", String(timeoutS),
    "opencode", "run", "--standalone", "--auto", "--model", `${provider}/${modelId}`, message,
  ];
}

function ensureImage() {
  const check = spawnSync("docker", ["image", "inspect", IMAGE], { encoding: "utf8", env: safeEnv() });
  if (check.status === 0) return;
  console.log(`building ${IMAGE}...`);
  const b = spawnSync(
    "docker",
    ["build", "-f", path.join(ROOT, "sandbox", "Dockerfile.opencode"), "-t", IMAGE, path.join(ROOT, "sandbox")],
    { encoding: "utf8", stdio: "inherit", env: safeEnv() }
  );
  if (b.status !== 0) fail("docker build failed (sandbox/Dockerfile.opencode)");
}

// The agent is told to write a file, never to answer in chat: the LOC metric is a
// property of a file. Extra files it creates are not counted, and the next line
// says so, because an agent that splits the solution across modules would
// otherwise look lean while adding exactly the review burden being measured.
const FILE_RULE =
  "\n\n---\nWrite the complete file to solution.py in the current directory with the write tool. " +
  "Do not print the code as your answer, do not create any other file, and do not run the tests.";

async function run({ jobDir, taskMd, system, provider, modelId, timeoutS = DEFAULT_TIMEOUT_S }) {
  if (!provider || !provider.base || !provider.keyEnv) fail("needs the provider entry from runner/providers.json");
  const key = String(process.env[provider.keyEnv] ?? "").trim();
  if (!key) fail(`${provider.keyEnv} not set`);

  ensureImage();
  const runDir = path.join(TMP, `${path.basename(jobDir)}_oc`);
  for (const d of ["config/opencode", "data", "cache", "state", "home"]) {
    fs.mkdirSync(path.join(runDir, d), { recursive: true });
  }
  fs.writeFileSync(
    path.join(runDir, "config", "opencode", "opencode.json"),
    JSON.stringify(buildConfig({ provider: "slopbench", base: provider.base, keyEnv: provider.keyEnv, modelId }), null, 2)
  );

  const message = [system, taskMd].filter(Boolean).join("\n\n") + FILE_RULE;
  const args = opencodeArgs({ runDir, jobDir, provider: "slopbench", modelId, keyEnv: provider.keyEnv, message, timeoutS });
  const started = Date.now();
  const r = spawnSync("docker", args, {
    encoding: "utf8",
    env: { PATH: process.env.PATH || "", HOME: process.env.HOME || "", [provider.keyEnv]: key },
    timeout: (timeoutS + 120) * 1000,
    maxBuffer: 32 * 1024 * 1024,
  });
  const out = `${r.stdout || ""}\n${r.stderr || ""}`.replace(/\x1b\[[0-9;]*[A-Za-z]/g, "");
  const lines = out.split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith(">")).slice(-8);
  fs.rmSync(runDir, { recursive: true, force: true });

  // A throttled run is the provider's fault, not the model's. run.js records the
  // thrown message as a provider error and retries it on the next sweep.
  if (/rate.?limit|too many requests|quota exceeded|free usage limit/i.test(out)) {
    fail(`dropped: the provider rate-limited the agent (last output: ${lines.join(" | ").slice(0, 300)})`);
  }

  const entry = path.join(jobDir, "solution.py");
  if (!fs.existsSync(entry)) {
    fail(`the agent wrote no solution.py (exit ${r.status}); last output: ${lines.join(" | ").slice(0, 400)}`);
  }
  const code = fs.readFileSync(entry, "utf8");
  if (!code.trim()) fail(`the agent left solution.py empty (exit ${r.status})`);

  // Which files it touched is the difference between "solved it in one file" and
  // "wrote the solution, then three helpers that are not counted".
  const extra = fs.readdirSync(jobDir).filter((f) => f !== "solution.py" && !f.startsWith("."));
  return { code, ms: Date.now() - started, extra_files: extra, tail: lines.join(" | ").slice(0, 400) };
}

module.exports = { run, ensureImage, buildConfig, opencodeArgs, FILE_RULE, IMAGE, OPENCODE_VERSION, TMP };
