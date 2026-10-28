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
    const name = m.provider || cfg.provider || "openrouter";
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

console.log(`test_provider: PASS (${CONFIGS.length} configs, ${live.models.length} free models, ${Object.keys(providers).length} providers)`);
