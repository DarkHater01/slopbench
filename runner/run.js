#!/usr/bin/env node
// SlopBench runner: model × task × variant × rep -> sandboxed test run -> data/raw.json
// Zero dependencies. Real models need the key named by their provider in
// runner/providers.json; entries with "fixture" read canned responses instead
// (offline testing / CI smoke).
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const CFG_PATH = process.env.SLOPBENCH_CONFIG
  ? path.resolve(process.cwd(), process.env.SLOPBENCH_CONFIG)
  : path.join(__dirname, "config.json");
const cfg = require(CFG_PATH);
const providers = require("./providers.json");
const IMAGE = "slopbench-sandbox";
const RAW_PATH = process.env.SLOPBENCH_RAW || path.join(ROOT, "data", "raw.json");

function fail(msg) {
  console.error(`run.js: ${msg}`);
  process.exit(1);
}

// A model may name its own provider; otherwise the config default applies. Two
// providers in one roster is normal (a model id only exists at one of them), and
// getting it wrong fails as a 400 that looks like a model failure.
function providerOf(model) {
  const name = model.provider || cfg.provider || "openrouter";
  const p = providers[name];
  if (!p) fail(`unknown provider "${name}" for ${model.id} (known: ${Object.keys(providers).join(", ")})`);
  return { name, ...p, key: String(process.env[p.keyEnv] ?? "").trim() };
}

const fixtureModels = cfg.models.filter((m) => m.fixture);
const liveModels = cfg.models.filter((m) => !m.fixture);
const missing = [...new Set(liveModels.map((m) => providerOf(m)).filter((p) => !p.key).map((p) => p.keyEnv))];
if (missing.length) fail(`${missing.join(", ")} not set (needed by the non-fixture models in ${path.relative(ROOT, CFG_PATH)})`);

// SECURITY: pass only needed vars to docker/build children; never the API key.
function safeEnv() {
  return { PATH: process.env.PATH || "", HOME: process.env.HOME || "" };
}

function listTasks() {
  const dir = path.join(ROOT, "tasks");
  return fs
    .readdirSync(dir)
    .map((d) => path.join(dir, d))
    .filter((p) => fs.statSync(p).isDirectory() && fs.existsSync(path.join(p, "task.json")))
    .sort();
}

function loc(code) {
  return code
    .split("\n")
    .filter((l) => {
      const t = l.trim();
      return t && !t.startsWith("#");
    })
    .length;
}

// Heuristic for obvious metric gaming (not a jailbreak-proof ban).
const SUSPICIOUS = /\b(exec|eval|compile|os\._exit|sys\.exit|__import__)\s*\(/;
function isSuspicious(code) {
  return SUSPICIOUS.test(code);
}

function extractCode(text) {
  const fence = text.match(/```(?:python|py)\s*\n([\s\S]*?)```/);
  return (fence ? fence[1] : text).trim() + "\n";
}

async function callModel(provider, modelId, system, user) {
  const body = {
    model: modelId,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature: 0.2,
  };
  // Free-tier endpoints queue heavily; 429/5xx need room. This call can take minutes.
  for (let attempt = 1; attempt <= 5; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 240_000);
    try {
      const res = await fetch(`${provider.base}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${provider.key}`,
          "Content-Type": "application/json",
          ...(provider.headers || {}),
        },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      // Zen reports an exhausted free quota as 429 with the reason in the body:
      // keep it, or "429 for 5 attempts" hides the only actionable sentence.
      if (res.status === 429 || res.status >= 500) {
        const detail = (await res.text()).slice(0, 300);
        if (attempt === 5) throw new Error(`${provider.name} ${res.status} for ${modelId} after 5 retries: ${detail}`);
        console.error(`   ${provider.name} ${res.status}, retrying in 60s: ${detail}`);
        await new Promise((r) => setTimeout(r, 60_000));
        continue;
      }
      if (!res.ok) throw new Error(`${provider.name} ${res.status} for ${modelId}: ${(await res.text()).slice(0, 300)}`);
      const json = await res.json();
      const content = json.choices?.[0]?.message?.content;
      if (typeof content !== "string") throw new Error(`empty completion from ${modelId}`);
      return content;
    } catch (e) {
      // Let the per-run error handler in main() record this and keep the batch going.
      if (attempt === 5) throw new Error(`${provider.name} request failed for ${modelId}: ${e.message}`);
      await new Promise((r) => setTimeout(r, 60_000));
    } finally {
      clearTimeout(timer);
    }
  }
}

function parseJunit(xml) {
  const su = xml.match(/<testsuite\b([^>]*)>/);
  if (!su) return null;
  const attrs = su[1];
  const num = (name) => {
    const m = attrs.match(new RegExp(`\\b${name}="(\\d+)"`));
    return m ? +m[1] : null;
  };
  return { tests: num("tests"), failures: num("failures"), errors: num("errors") };
}

// Host-side judge: never trust exit code alone (a model could os._exit(0)).
// junit.xml written inside /job survives the container; require a real run.
function dockerRun(jobDir, timeoutS) {
  const args = [
    "run", "--rm",
    "--network", "none",
    "--memory", "512m", "--memory-swap", "512m",
    "--cpus", "1",
    "--pids-limit", "128",
    "--ulimit", "fsize=1048576",
    "--read-only",
    "--tmpfs", "/tmp:rw,size=64m,mode=1777",
    "--security-opt", "no-new-privileges",
    "--cap-drop", "ALL",
    "--user", `${typeof process.getuid === "function" ? process.getuid() : 1000}:${typeof process.getgid === "function" ? process.getgid() : 1000}`,
    "-v", `${jobDir}:/job`,
    "-w", "/job",
    IMAGE,
    "timeout", String(timeoutS), "python", "-m", "pytest", "-q", "--junitxml=out.xml",
  ];
  const r = spawnSync("docker", args, { encoding: "utf8", env: safeEnv(), timeout: (timeoutS + 25) * 1000 });
  if (r.error) fail(`docker: ${r.error.message}`);
  const xmlPath = path.join(jobDir, "out.xml");
  const junit = fs.existsSync(xmlPath) ? parseJunit(fs.readFileSync(xmlPath, "utf8")) : null;
  const out = `${r.stdout || ""}${r.stderr || ""}`;
  return {
    timed_out: r.status === 124,
    junit,
    passed: !!junit && junit.tests > 0 && junit.failures === 0 && junit.errors === 0,
    tail: out.slice(-400),
  };
}

function ensureImage() {
  const check = spawnSync("docker", ["image", "inspect", IMAGE], { encoding: "utf8", env: safeEnv() });
  if (check.status === 0) return;
  console.log("building sandbox image...");
  const b = spawnSync("docker", ["build", "-t", IMAGE, path.join(ROOT, "sandbox")], {
    encoding: "utf8", stdio: "inherit", env: safeEnv(),
  });
  if (b.status !== 0) fail("docker build failed");
}

const TMP = path.join(ROOT, "runner", "tmp");
function prepareJob(taskDir, code) {
  const task = require(path.join(taskDir, "task.json"));
  const job = path.join(TMP, `${task.id}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);
  fs.mkdirSync(path.join(job, "tests"), { recursive: true });
  const entryName = path.basename(task.entry || "solution.py"); // basename kills any ../ traversal
  const entry = path.join(job, entryName);
  fs.writeFileSync(entry, code);
  fs.copyFileSync(
    path.join(taskDir, "tests", "test_solution.py"),
    path.join(job, "tests", "test_solution.py"),
  );
  fs.writeFileSync(path.join(job, "conftest.py"), "");
  return { job, task };
}

async function main() {
  ensureImage();
  fs.mkdirSync(path.dirname(RAW_PATH), { recursive: true });
  fs.rmSync(TMP, { recursive: true, force: true });
  fs.mkdirSync(TMP, { recursive: true });

  const tasks = listTasks();
  // Resume: load completed runs so restarts never redo them (fire-and-forget safe).
  // Error records are not "completed": a 429 from a free tier is a provider outage,
  // and skipping it forever would turn one bad night into a permanent 0.00.
  let raw = [];
  if (fs.existsSync(RAW_PATH)) {
    try {
      const before = JSON.parse(fs.readFileSync(RAW_PATH, "utf8"));
      if (Array.isArray(before)) raw = before;
    } catch {
      /* corrupt partial file — start over */
    }
  }
  const done = new Set(raw.filter((r) => !r.error).map((r) => `${r.model}|${r.task}|${r.variant}|${r.rep}`));
  const completed = raw.length;
  console.log(`resume: ${completed} completed runs, ${cfg.models.length * tasks.length * Object.keys(cfg.variants).length * cfg.reps} total`);
  for (const model of cfg.models) {
    for (const taskDir of tasks) {
      const taskMd = fs.readFileSync(path.join(taskDir, "task.md"), "utf8");
      for (const [variant, system] of Object.entries(cfg.variants)) {
        for (let rep = 1; rep <= cfg.reps; rep++) {
          const key = `${model.id}|${path.basename(taskDir)}|${variant}|${rep}`;
          if (done.has(key)) continue;
          const label = `${model.id}/${path.basename(taskDir)}/${variant}#${rep}`;
          console.log(`run: ${label}`);
          try {
            let content;
            if (model.fixture) {
              const fdir = path.join(__dirname, "fixtures", model.fixture);
              const vfile = path.join(fdir, path.basename(taskDir), `${variant}.py`);
              content = fs.readFileSync(
                fs.existsSync(vfile) ? vfile : path.join(fdir, `${path.basename(taskDir)}.py`),
                "utf8",
              );
            } else {
              const provider = providerOf(model);
              if (provider.paceMs) await new Promise((r) => setTimeout(r, provider.paceMs));
              content = await callModel(provider, model.id, system, taskMd);
            }
            const code = extractCode(content);
            const { job, task } = prepareJob(taskDir, code);
            const r = dockerRun(job, cfg.pass_timeout_seconds);
            fs.rmSync(job, { recursive: true, force: true });
            raw.push({
              model: model.id,
              task: task.id,
              variant,
              rep,
              passed: r.passed,
              timed_out: r.timed_out,
              junit: r.junit,
              suspicious: isSuspicious(code),
              loc: loc(code),
              tail: r.passed ? "" : r.tail,
            });
          } catch (e) {
            raw.push({
              model: model.id,
              task: path.basename(taskDir),
              variant,
              rep,
              passed: false,
              error: e.message,
              loc: 0,
              junit: null,
            });
            console.error(`   error: ${e.message}`);
          }
          fs.writeFileSync(RAW_PATH, JSON.stringify(raw, null, 2));
        }
      }
    }
  }

  console.log(`done: ${raw.length} runs -> ${RAW_PATH}`);
}

main().catch((e) => fail(e.stack || e));