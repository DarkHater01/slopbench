#!/usr/bin/env node
// Zero-dependency test for runner/score.js guards.
// Reads the immutable mock fixture data/raw.mock.json and writes only into runner/tmp/,
// so a grading run in data/ can never corrupt the test (and vice versa).
// Run: node runner/test_score.js
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const REPO = path.resolve(__dirname, "..");
const CFG = path.join(REPO, "runner", "config.mock.json");
const FIXTURE = path.join(REPO, "data", "raw.mock.json");
const TMP = path.join(REPO, "runner", "tmp");
const OUT = path.join(TMP, "results.json");

function score(rawPath, outPath) {
  return spawnSync("node", [path.join(REPO, "runner", "score.js")], {
    encoding: "utf8",
    env: { ...process.env, SLOPBENCH_CONFIG: CFG, SLOPBENCH_RAW: rawPath, SLOPBENCH_OUT: outPath },
  });
}

function writeRaw(name, obj) {
  const p = path.join(TMP, name);
  fs.writeFileSync(p, JSON.stringify(obj));
  return p;
}

fs.rmSync(TMP, { recursive: true, force: true });
fs.mkdirSync(TMP, { recursive: true });

const base = JSON.parse(fs.readFileSync(FIXTURE, "utf8"));
assert(Array.isArray(base) && base.length > 0, "data/raw.mock.json is empty");

let r = score(FIXTURE, OUT);
assert.strictEqual(r.status, 0, `valid raw should score:\n${r.stderr || r.stdout}`);
const res = JSON.parse(fs.readFileSync(OUT, "utf8"));
assert(res.reps > 0 && Array.isArray(res.models), "results shape");
for (const m of res.models) {
  assert(m.vanilla && m.minimal, `model ${m.id} needs both variants`);
  assert.strictEqual(typeof m.vanilla.pass_at_1, "number", "pass_at_1 numeric");
}
const bloated = res.models.find((m) => m.id === "mock-bloated");
assert(bloated, "mock-bloated present");
assert.strictEqual(
  bloated.vanilla.per_task["03-date-range"].inflation,
  null,
  "failing task must not qualify (inflation null)",
);

const variable = res.models.find((m) => m.id === "mock-variable");
assert(variable, "mock-variable present");
assert(
  variable.ponytail_delta.overall > 0,
  "ponytail_delta must be > 0 when variants produce different code",
);

const missing = base.filter(
  (x) => !(x.model === "mock-lean" && x.task === "01-parse-args" && x.variant === "vanilla"),
);
r = score(writeRaw("missing.json", missing), path.join(TMP, "out-missing.json"));
assert.strictEqual(r.status, 1, "missing group must be rejected");

const dup = base.map((x, i) => (i === 3 ? { ...x, rep: 1 } : x));
r = score(writeRaw("dup.json", dup), path.join(TMP, "out-dup.json"));
assert.strictEqual(r.status, 1, "duplicate reps must be rejected");

// A sweep the free tier cut short leaves a group with fewer reps. Strict scoring
// must reject that; partial scoring must accept it and flag the model instead.
const cut = base.filter((x) => !(x.model === "mock-lean" && x.task === "05-csv-merge"));
r = score(writeRaw("cut.json", cut), path.join(TMP, "out-cut.json"));
assert.strictEqual(r.status, 1, "strict scoring must reject a group cut short");
const env = { ...process.env, SLOPBENCH_PARTIAL: "1" };
r = spawnSync("node", [path.join(REPO, "runner", "score.js")], {
  encoding: "utf8",
  env: { ...env, SLOPBENCH_CONFIG: CFG, SLOPBENCH_RAW: path.join(TMP, "cut.json"), SLOPBENCH_OUT: path.join(TMP, "out-cut-partial.json") },
});
assert.strictEqual(r.status, 0, `partial scoring must accept a sweep cut short:\n${r.stderr || r.stdout}`);
const partial = JSON.parse(fs.readFileSync(path.join(TMP, "out-cut-partial.json"), "utf8"));
assert(
  partial.models.some((m) => m.status === "in_progress" && m.id === "mock-lean"),
  "a model whose sweep was cut short must be flagged in_progress",
);
assert(
  partial.models.some((m) => m.status === "complete" && m.id === "mock-bloated"),
  "a model that finished must stay scored in a partial snapshot",
);

console.log("test_score: PASS (valid-ok, missing-group, dup-rep, qualify-gate, partial-cut-short)");

// A throttled run is not a model failure. Strict scoring must still succeed (the
// group exists) but must not publish a 0.00 the model never earned.
const throttled = base.map((x) =>
  x.model === "mock-bloated" && x.task === "02-dedupe-json" && x.variant === "vanilla" && x.rep === 1
    ? { ...x, passed: false, loc: 0, junit: null, error: "opencode: dropped: Free usage limit reached" }
    : x,
);
assert(
  throttled.filter((x) => x.error).length === 1,
  "the throttled fixture did not match a run — fix the test, not the assertion",
);
r = score(writeRaw("throttled.json", throttled), path.join(TMP, "out-throttled.json"));
assert.strictEqual(r.status, 0, `a throttled run must still score:\n${r.stderr || r.stdout}`);
const t = JSON.parse(fs.readFileSync(path.join(TMP, "out-throttled.json"), "utf8"));
const tm = t.models.find((m) => m.id === "mock-bloated");
assert.strictEqual(tm.status, "in_progress", "a throttled model must not be published");
assert(/throttled/.test(tm.note), "the note must say the runs were throttled");

console.log("test_score: PASS (+ throttled model withheld)");
