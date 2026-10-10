#!/usr/bin/env node
// Offline demo for the README GIF: shows the "bloat collapsing" visual instantly.
// Prints, per task, the LOC a bloated solution needs vs. the minimal variant,
// using the mock-variable fixtures (no API key, no Docker).
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..");
const FIX = path.join(__dirname, "fixtures", "mock-variable");

const loc = (code) =>
  code.split("\n").filter((l) => {
    const t = l.trim();
    return t && !t.startsWith("#");
  }).length;

const tasks = fs
  .readdirSync(path.join(REPO, "tasks"))
  .filter((d) => fs.existsSync(path.join(REPO, "tasks", d, "task.json")))
  .sort();

console.log("\n  what LLM agents write  vs  the least that passes\n");
let inflatedTotal = 0;
let leanTotal = 0;
for (const t of tasks) {
  const inflated = loc(fs.readFileSync(path.join(FIX, t, "vanilla.py"), "utf8"));
  const lean = loc(fs.readFileSync(path.join(FIX, t, "minimal.py"), "utf8"));
  inflatedTotal += inflated;
  leanTotal += lean;
  const maxTask = inflated;
  const bfull = "█".repeat(Math.round((inflated / maxTask) * 14));
  const blean = "█".repeat(Math.round((lean / maxTask) * 14));
  console.log(
    `  ${t.padEnd(20)} ${String(inflated).padStart(3)}  ${bfull.padEnd(15)}  ->  ${String(lean).padStart(3)}\t${blean}`,
  );
}
const delta = inflatedTotal - leanTotal;
const factor = (inflatedTotal / leanTotal).toFixed(1);
console.log(`\n  wait. it can write ${inflatedTotal} or ${leanTotal} for the same tests?`);
console.log(`  that is ${delta} lines of slop (${factor}×) a reviewer did not get paid for.\n`);