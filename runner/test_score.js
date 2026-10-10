#!/usr/bin/env node
// Zero-dependency test for runner/score.js guards, using the repo's real data.
// Run: node runner/test_score.js
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const REPO = path.resolve(__dirname, "..");
const RAW = path.join(REPO, "data", "raw.json");
const OUT = path.join(REPO, "data", "test-results.json");
const backup = fs.readFileSync(RAW, "utf8");

function run(raw) {
  fs.writeFileSync(RAW, JSON.stringify(raw));
  return spawnSync("node", [path.join(REPO, "runner", "score.js")], {
    encoding: "utf8",
    env: { ...process.env, SLOPBENCH_OUT: OUT },
  });
}

try {
  const base = JSON.parse(backup);
  assert(base.length > 0, "data/raw.json is empty — run the e2e mock first");

  let r = run(base);
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
  r = run(missing);
  assert.strictEqual(r.status, 1, "missing group must be rejected");

  const dup = base.map((x, i) => (i === 3 ? { ...x, rep: 1 } : x));
  r = run(dup);
  assert.strictEqual(r.status, 1, "duplicate reps must be rejected");

  console.log("test_score: PASS (valid-ok, missing-group, dup-rep, qualify-gate)");
} finally {
  fs.writeFileSync(RAW, backup);
  fs.rmSync(OUT, { force: true });
}