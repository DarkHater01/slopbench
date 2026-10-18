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

console.log("test_score: PASS (valid-ok, missing-group, dup-rep, qualify-gate)");
