#!/usr/bin/env node
// Aggregates data/raw.json into data/results.json (the leaderboard payload).
// Zero dependencies. Throws on inconsistent input — this file is the check.
const fs = require("fs");
const path = require("path");

const ROOT = process.env.SLOPBENCH_ROOT || path.resolve(__dirname, "..");
const RAW = process.env.SLOPBENCH_RAW || path.join(ROOT, "data", "raw.json");
const OUT = process.env.SLOPBENCH_OUT || path.join(ROOT, "data", "results.json");
const cfg = require(path.join(ROOT, "runner", "config.json"));

function fail(msg) {
  console.error(`score.js: ${msg}`);
  process.exit(1);
}

function locOf(file) {
  return fs
    .readFileSync(file, "utf8")
    .split("\n")
    .filter((l) => {
      const t = l.trim();
      return t && !t.startsWith("#");
    }).length;
}

const median = (a) => {
  const s = [...a].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

let raw;
try {
  raw = JSON.parse(fs.readFileSync(RAW, "utf8"));
} catch (e) {
  fail(`cannot read ${RAW}: ${e.message}`);
}
if (!Array.isArray(raw) || raw.length === 0) fail(`no runs in ${RAW}`);

const tasksDir = path.join(ROOT, "tasks");
const taskIds = fs
  .readdirSync(tasksDir)
  .filter((d) => fs.existsSync(path.join(tasksDir, d, "task.json")))
  .sort();

const refLoc = {};
for (const id of taskIds) {
  refLoc[id] = locOf(path.join(tasksDir, id, "reference", "solution.py"));
}

const QUALIFY = 0.6;
const groupKey = (r) => `${r.model}|${r.task}|${r.variant}`;
const groups = new Map();
for (const r of raw) {
  const k = groupKey(r);
  if (!groups.has(k)) groups.set(k, []);
  groups.get(k).push(r);
}

// every group must have cfg.reps distinct reps
for (const [k, runs] of groups) {
  if (runs.length !== cfg.reps) fail(`group ${k} has ${runs.length} runs, expected ${cfg.reps}`);
  if (new Set(runs.map((r) => r.rep)).size !== cfg.reps) fail(`duplicate reps in group ${k}`);
}

const modelStats = {};
for (const r of raw) {
  const s = (modelStats[r.model] = modelStats[r.model] || { runs: 0, errors: 0, modelGroups: 0 });
  s.runs++;
  if (r.error) s.errors++;
}
for (const k of groups.keys()) modelStats[k.split("|")[0]].modelGroups++;
const perModelGroups = taskIds.length * Object.keys(cfg.variants).length;

// Strict by default (this file is the check). SLOPBENCH_PARTIAL=1 allows scoring
// a mid-run snapshot: complete models are scored, the rest are flagged.
const PARTIAL = !!process.env.SLOPBENCH_PARTIAL;
const exactModels = cfg.models.length * perModelGroups;
if (groups.size !== exactModels) {
  if (!PARTIAL) fail(`expected ${exactModels} groups, got ${groups.size}`);
  if (groups.size > exactModels) fail(`more groups than expected (${groups.size} > ${exactModels})`);
}

const models = {};
for (const r of raw) {
  models[r.model] = models[r.model] || { variants: {} };
}

for (const [model, m] of Object.entries(models)) {
  const s = modelStats[model];
  m.status = "complete";
  if (PARTIAL && (s.errors === s.runs || s.modelGroups !== perModelGroups)) {
    m.status = s.errors === s.runs ? "blocked" : "in_progress";
    m.note =
      s.errors === s.runs
        ? `all ${s.runs} runs failed with API errors`
        : `partial: ${s.runs} of ${perModelGroups * cfg.reps} runs`;
    continue;
  }
  for (const variant of Object.keys(cfg.variants)) {
    const perTask = {};
    for (const taskId of taskIds) {
      const runs = groups.get(`${model}|${taskId}|${variant}`) || [];
      const passedRuns = runs.filter((r) => r.passed && !r.suspicious);
      const passRate = passedRuns.length / runs.length;
      const entry = {
        pass_at_1: Math.round(passRate * 100) / 100,
        consistent: passedRuns.length === runs.length,
      };
      if (passRate >= QUALIFY) {
        entry.loc = Math.round(median(passedRuns.map((r) => r.loc)) * 100) / 100;
        entry.inflation = Math.round((entry.loc / refLoc[taskId]) * 100) / 100;
      } else {
        entry.loc = null;
        entry.inflation = null;
      }
      perTask[taskId] = entry;
    }
    const qualified = Object.values(perTask).filter((e) => e.inflation !== null);
    m.variants[variant] = {
      per_task: perTask,
      pass_at_1: Object.keys(perTask).length
        ? Math.round((Object.values(perTask).reduce((s, e) => s + e.pass_at_1, 0) / Object.keys(perTask).length) * 100) / 100
        : null,
      inflation:
        qualified.length
          ? Math.round((qualified.reduce((s, e) => s + e.inflation, 0) / qualified.length) * 100) / 100
          : null,
    };
  }
  const v = m.variants.vanilla;
  const mi = m.variants.minimal;
  m.ponytail_delta = { per_task: {}, overall: null };
  if (!v || !mi) continue;
  for (const taskId of taskIds) {
    const a = v.per_task[taskId];
    const b = mi.per_task[taskId];
    if (a && b && a.inflation !== null && b.inflation !== null) {
      m.ponytail_delta.per_task[taskId] = Math.round((a.loc - b.loc) * 100) / 100;
    }
  }
  const deltas = Object.values(m.ponytail_delta.per_task);
  m.ponytail_delta.overall = deltas.length
    ? Math.round((deltas.reduce((s, d) => s + d, 0) / deltas.length) * 100) / 100
    : null;
}

// guard rails: sane LOC, no NaNs
for (const r of raw) {
  if (!(r.loc >= 0 && r.loc <= 5000)) fail(`suspicious loc=${r.loc} for ${r.model}/${r.task}`);
  if (typeof r.passed !== "boolean") fail(`raw record missing boolean passed: ${JSON.stringify(r)}`);
  if (refLoc[r.task] == null) fail(`no reference loc for task ${r.task}`);
}

const results = {
  generated_at: new Date().toISOString(),
  reps: cfg.reps,
  qualify_threshold: QUALIFY,
  tasks: refLoc,
  models: cfg.models
    .map(({ id }) => {
      const m = models[id];
      if (!m) return PARTIAL ? { id, status: "pending" } : null;
      if (m.status !== "complete")
        return { id, status: m.status, note: m.note || "not scored" };
      return {
        id,
        status: "complete",
        vanilla: m.variants.vanilla,
        minimal: m.variants.minimal,
        ponytail_delta: m.ponytail_delta,
      };
    })
    .filter(Boolean),
};

fs.writeFileSync(OUT, JSON.stringify(results, null, 2));
console.log(`scored ${raw.length} runs -> ${OUT}`);