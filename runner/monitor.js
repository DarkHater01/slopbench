#!/usr/bin/env node
// SlopBench progress monitor. Usage: node runner/monitor.js [--watch]
// One-shot prints status; --watch reprints every 5s with a rate/ETA estimate.
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..");
const cfg = require(REPO + "/runner/config.json");
const RAW = path.join(REPO, "data", "raw.json");
const LOG = process.env.SLOPBENCH_LOG || "/tmp/opencode/bench-run.log";

const tasks = fs
  .readdirSync(REPO + "/tasks")
  .filter((d) => fs.existsSync(REPO + "/tasks/" + d + "/task.json")).length;
const variants = Object.keys(cfg.variants).length;
const total = cfg.models.length * tasks * variants * cfg.reps;

function readRaw() {
  try {
    const d = JSON.parse(fs.readFileSync(RAW, "utf8"));
    return Array.isArray(d) ? d : [];
  } catch {
    return [];
  }
}

function hms(sec) {
  sec = Math.max(0, Math.round(sec));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

function status() {
  const raw = readRaw();
  const perc = total ? ((raw.length / total) * 100).toFixed(0) : 0;
  const lines = [`\x1b[1m${raw.length}/${total} runs (${perc}%)\x1b[0m`];
  for (const m of cfg.models) {
    const runs = raw.filter((r) => r.model === m.id);
    const ok = runs.filter((r) => r.passed).length;
    const errs = runs.filter((r) => r.error).length;
    lines.push(
      `  ${m.id}  done=${runs.length}/${variants * tasks * cfg.reps}  pass=${ok}  errors=${errs}`,
    );
  }
  try {
    const last = fs.readFileSync(LOG, "utf8").trim().split("\n").pop().trim();
    if (last.startsWith("run:")) lines.push(`  now: ${last.slice(5)}`);
  } catch {}
  return lines.join("\n");
}

let baseCount = -1;
let baseTime = 0;
function tick() {
  const raw = readRaw();
  const now = Date.now();
  if (baseCount >= 0 && raw.length > baseCount) {
    const secPer = (now - baseTime) / 1000 / (raw.length - baseCount);
    const remaining = total - raw.length;
    const eta = hms(remaining * secPer);
    process.stdout.write(`\x1b[2J\x1b[H${status()}\n  rate: ~${secPer.toFixed(1)}s/run  ETA: ${eta}\n`);
  } else {
    process.stdout.write(`\x1b[2J\x1b[H${status()}\n  rate: measuring… (add --watch and wait)\n`);
  }
  baseCount = raw.length;
  baseTime = now;
}

if (process.argv.includes("--watch")) {
  tick();
  setInterval(tick, 5000);
} else {
  console.log(status());
}