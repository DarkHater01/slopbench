#!/usr/bin/env node
// Offline check of the provider wiring: every model in every config must name a
// provider that exists in providers.json, and that provider must declare where it
// lives and which env var holds its key. A typo here fails as a 400 that looks
// like the model was bad, which is the expensive direction.
const assert = require("assert");
const path = require("path");

const providers = require("./providers.json");
const CONFIGS = ["config.json", "config.smoke.json", "config.mock.json"];

for (const file of CONFIGS) {
  const cfg = require(path.join(__dirname, file));
  assert(Number.isInteger(cfg.reps) && cfg.reps >= 1, `${file}: reps must be a positive integer`);
  assert(Array.isArray(cfg.models) && cfg.models.length, `${file}: no models`);

  const ids = cfg.models.map((m) => m.id);
  assert.strictEqual(new Set(ids).size, ids.length, `${file}: duplicate model id`);

  for (const m of cfg.models) {
    if (m.fixture) continue; // fixtures never reach the network
    const name = m.provider || cfg.provider;
    const p = providers[name];
    assert(p, `${file}: model ${m.id} names unknown provider "${name}"`);
    assert(/^https:\/\//.test(p.base), `${file}: provider "${name}" has no https base`);
    assert(p.keyEnv && process.env[p.keyEnv] !== "", `${file}: provider "${name}" declares no keyEnv`);
  }
}

// The live roster must be free: a paid model id here would quietly spend money
// every Monday. Zen's free ids are the ones that end in -free.
const live = require("./config.json");
for (const m of live.models) {
  assert(/-free$/.test(m.id), `config.json: ${m.id} is not a -free model`);
}
assert.strictEqual(live.provider, "opencode-zen", "config.json: expected the free OpenCode Zen provider");
assert.strictEqual(live.harness, "opencode", "config.json: expected the agent harness");
assert(live.agent_timeout_seconds > 0, "config.json: agent_timeout_seconds must be set for the agent harness");

// The agent argv is built without Docker, so its invariants are cheap to pin: the
// key travels by name, and the run is not allowed to be unhardened.
const { opencodeArgs } = require("./opencode");
const argv = opencodeArgs({
  runDir: "/tmp/oc", jobDir: "/tmp/job", provider: "slopbench",
  modelId: "deepseek-v4.1-flash-free", keyEnv: "OPENCODE_API_KEY", message: "hi",
});
const s = argv.join(" ");
assert(/ -e OPENCODE_API_KEY /.test(` ${s} `), "opencode argv must pass the key by env name, never by value");
assert(!s.includes("sk-"), "opencode argv must not contain a credential");
assert(s.includes("--cap-drop ALL"), "opencode argv must drop capabilities");
assert(s.includes("--security-opt no-new-privileges"), "opencode argv must set no-new-privileges");
assert(s.includes("--network bridge"), "opencode argv needs the network its provider lives on");

// A spent free-tier quota and a retried run are the two ways a sweep resumes; both
// are pure, so they are checked here instead of in a 240-run CI job.
const { quotaSpent, withoutFailed } = require("./resume");
assert(quotaSpent("opencode: dropped: ... Error: Free usage limit reached."), "the quota message must stop the sweep");
assert(!quotaSpent("opencode: the agent wrote no solution.py"), "an ordinary failure must not stop the sweep");
const failed = { model: "m", task: "t", variant: "vanilla", rep: 1, error: "429" };
const passed = { model: "m", task: "t", variant: "vanilla", rep: 1, passed: true };
assert.strictEqual(withoutFailed([failed], "m|t|vanilla|1").length, 0, "a retried key drops its failed record");
assert.strictEqual(withoutFailed([failed, passed], "m|t|vanilla|1").length, 1, "a retry must not leave two records for one rep");
assert.strictEqual(withoutFailed([failed], "m|t|vanilla|2").length, 1, "another rep's failure must survive");

console.log(`test_provider: PASS (${CONFIGS.length} configs, ${live.models.length} free models, ${Object.keys(providers).length} providers, agent argv hardened)`);
