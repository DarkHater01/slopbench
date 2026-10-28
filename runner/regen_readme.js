#!/usr/bin/env node
// Regenerates the README leaderboard table from data/results.json.
// Written between <!-- LEADERBOARD:start --> and <!-- LEADERBOARD:end -->.
// Zero dependencies. Call after score.js in CI and it keeps the landing page current.
const fs = require("fs");
const path = require("path");

const ROOT = process.env.SLOPBENCH_ROOT || path.resolve(__dirname, "..");
const RESULTS = process.env.SLOPBENCH_OUT || path.join(ROOT, "data", "results.json");
const README = path.join(ROOT, "README.md");

const fmt = (n) => `${n}×`;
// Δ = vanilla LOC − minimal LOC: negative means the minimal prompt wrote MORE.
const fdelta = (v) => (v > 0 ? `−${v}` : v < 0 ? `+${-v}` : "0");

function row(m) {
  const v = m.vanilla && m.vanilla.inflation != null;
  const g = m.status === "complete";
  if (!v && g) {
    const p = (m.vanilla && m.vanilla.pass_at_1) || m.minimal.pass_at_1 || 0;
    return `| ${m.id} | ${p} | — | — | — |`;
  }
  if (m.status !== "complete")
    return `| ${m.id} | _${m.note || m.status}_ | | | |`;
  return (
    `| ${m.id} | ${m.vanilla.pass_at_1} | ${fmt(m.vanilla.inflation)} | ` +
    `${fmt(m.minimal.inflation)} | ${m.ponytail_delta.overall == null ? "—" : `${fdelta(m.ponytail_delta.overall)} LOC`} |`
  );
}

const r = JSON.parse(fs.readFileSync(RESULTS, "utf8"));
const body =
  `| model | pass@1 | inflation | inflation (minimal prompt) | Δ ponytail |\n` +
  `|---|---|---|---|---|\n` +
  r.models.map(row).join("\n");

const readme = fs.readFileSync(README, "utf8");
const re = /<!-- LEADERBOARD:start -->[\s\S]*?<!-- LEADERBOARD:end -->/;
if (!re.test(readme)) {
  console.error("regen_readme.js: LEADERBOARD markers not found in README.md");
  process.exit(1);
}
fs.writeFileSync(README, readme.replace(re, `<!-- LEADERBOARD:start -->\n${body}\n<!-- LEADERBOARD:end -->`));
console.log(`README leaderboard updated (${r.models.length} models)`);