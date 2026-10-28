# SlopBench

[![CI](https://github.com/DarkHater01/slopbench/actions/workflows/bench.yml/badge.svg)](https://github.com/DarkHater01/slopbench/actions)
[![MIT](https://img.shields.io/github/license/DarkHater01/slopbench)](LICENSE)
[![live leaderboard](https://img.shields.io/badge/live-leaderboard-7ec8a9)](https://darkhater01.github.io/slopbench/)

**Code benchmarks measure whether a model solves the task. None measure how much code it wastes.**

SlopBench reports two numbers per model — and one that nobody else publishes:

| metric | what it answers |
|---|---|
| `pass@k` | Can the model solve the task at all? |
| `inflation` | **How many lines does it write to do it?** |
| `ponytail Δ` | **How many lines does a minimalism system prompt shave off?** |

> Reference solutions are in-repo, hand-written, and contestable via PR. The denominator is public on purpose.

---

<a href="docs/demo.gif"><img src="docs/demo.gif" alt="SlopBench demo" width="700"></a>

---

## The number

`inflation = LOC generated ÷ LOC of the reference solution`

A model that solves a 12-line task in 96 lines has inflation ≈ 8.0×. It passed the tests. It is also responsible for the review burden every engineer using AI agents is drowning in.

**Inflation is only counted for runs that pass the tests.** A two-line obfuscated one-liner that fails nothing? It doesn't qualify. Neither does a 3-line solution that passes 1 out of 5 tries. A model must reach `pass@1 ≥ 0.6` on a task before its LOC counts there. See [ADR-001](docs/adr/ADR-001-metric.md).

<!-- LEADERBOARD:start -->
| model | pass@1 | inflation | inflation (minimal prompt) | Δ ponytail |
|---|---|---|---|---|
| deepseek-v4.1-flash-free | 0.93 | 1.14× | 0.96× | −2.5 LOC |
| glm-5.3-flash-free | 0.93 | 1.11× | 1.04× | −1.3 LOC |
| nemotron-3.5-lightning-free | 0.87 | 1.19× | 1.26× | +2 LOC |
| nemotron-3.5-super-vl-free | 1 | 1.25× | 1.19× | −1.6 LOC |
| mimo-v2.6-flash-free | _1 of 10 runs were throttled; retried next sweep_ | | | |
| beam-free | _pending_ | | | |
| flint-40b-free | _pending_ | | | |
| jev-1.13-free | _pending_ | | | |
<!-- LEADERBOARD:end -->

_Snapshot regenerated daily by [GitHub Actions](.github/workflows/bench.yml) at `data/results.json`. Previous snapshots are in git history._

![live leaderboard](docs/screenshot.png)

---

## Models

### What this bench runs

Eight ids. They are not a wish list: this is exactly what OpenCode Zen answers as
free right now, taken from its own `GET /zen/v1/models` and filtered by `-free`.
The CI checks the configured roster against that live list before every sweep,
because the catalog lags and a retired id looks like a model failure. Nothing here
is paid; the cost is a rate limit and time.

| model | id | context |
|---|---|---|
| DeepSeek V4.1 Flash | `deepseek-v4.1-flash-free` | 200k |
| GLM-5.3 Flash | `glm-5.3-flash-free` | 200k |
| Nemotron 3.5 Lightning | `nemotron-3.5-lightning-free` | 262k |
| Nemotron 3.5 Super VL | `nemotron-3.5-super-vl-free` | 1M |
| MiMo V2.6 Flash | `mimo-v2.6-flash-free` | 200k |
| Beam | `beam-free` | 1M |
| Flint 40B | `flint-40b-free` | 262k |
| Jev 1.13 | `jev-1.13-free` | — |

A model that fails every task stays in the table at `0.00`: removing it would hide
the most useful row in the dataset.

### What OpenCode recommends

OpenCode's own [Models page](https://opencode.ai/docs/models/) lists six
recommended models. There is no public data on "the most used models in OpenCode",
so this is the honest proxy: a vendor-curated shortlist, not usage counts. None of
them is free, which is why the bench does not run them.

| model | id | context | $/1M in–out |
|---|---|---|---|
| GPT 5.2 | `openai/gpt-5.2` | 400k | 1.75 / 14 |
| GPT 5.1 Codex | `opencode/gpt-5.1-codex` | 400k | 1.07 / 8.5 |
| Claude Opus 4.5 | `anthropic/claude-opus-4-5` | 200k | 5 / 25 |
| Claude Sonnet 4.5 | `anthropic/claude-sonnet-4-5` | 200k | 3 / 15 |
| Minimax M2.1 | `minimax/MiniMax-M2.1` | 205k | 0.3 / 1.2 |
| Gemini 3 Pro | `opencode/gemini-3-pro` | 1M | 2 / 12 |

### Why there is no 0–10 column here

Other benchmarks collapse correctness, autonomy, own tests, code quality and
robustness into one weighted number. That works for ranking models on one task. It
cannot say anything about waste, because LOC is not in the rubric: a 9.8-scoring
solution can be three times longer than the reference and still score 9.8.
SlopBench keeps `pass@1` and `inflation` as separate axes and ranks with a Pareto
frontier, so no weighting decision can hide a sloppy solution. See
[ADR-001](docs/adr/ADR-001-metric.md).

## Provenance

| data | source | taken on |
|---|---|---|
| free roster | `GET https://opencode.ai/zen/v1/models`, filtered by `-free` | 2026-10-28 |
| recommended models | <https://opencode.ai/docs/models/> | 2026-10-27 |
| context windows | <https://models.dev/api.json> | 2026-10-27 |

The catalog is a snapshot: providers retire ids and re-price without notice. The
live list wins, which is why the workflow checks it.

---

## Why "ponytail Δ"

Every model runs each task **twice**:

- **vanilla** — "You are an expert Python developer. Solve the task exactly as specified."
- **minimal** — "Write the least Python that fully satisfies the spec. No classes, no abstractions, no comments, no error handling beyond what the spec requires. A few clear lines beat a clever framework."

The difference in median LOC is the cheapest lever against AI bloat that any team can pull **today**, without swapping models. The number exists to be measured, argued about, and stolen.

---

## How it works

```
tasks/               5 airtight Python specs (task.md) + reference/solution.py + pytest suite
runner/run.js        model × task × variant × rep → provider → Docker sandbox → data/raw.json
runner/opencode.js   the agent harness: the real OpenCode CLI in a container with a
                     network, told to write solution.py, graded afterwards without one
runner/providers.json  endpoint and the env var holding the key (OpenCode Zen)
runner/score.js      aggregates raw.json → data/results.json (throws on inconsistent input)
runner/test_score.js self-test of the scorer (no API required)
index.html           interactive leaderboard: pass@1 vs waste with a Pareto
                     frontier, sortable table, per-task breakdown and a dated
                     model catalog. Reads data/results.json at load time.
                     No backend, no framework.
```

**Two harnesses, one metric.** `harness: "chat"` is a single completion; `harness:
"opencode"` runs the agent CLI, lets it write the file with its tools, and grades
whatever landed on disk. The repo uses the agent harness, because that is the
thing people actually ship and because the free models are meant to be driven by
it. The inflation number means the same in both: lines in the solution file ÷
lines in the reference. Extra files the agent creates are reported per run and not
counted — a solution split across five modules would otherwise look lean.

Every generated solution runs inside a container with:

- `--network none`
- `--read-only` root filesystem
- `--user 1000:1000` (non-root)
- `--memory 512m --cpus 1 --pids-limit 128`
- 50-second timeout

Code written by models is treated as hostile. It never touches the host.

The agent that writes it runs in a second image (`sandbox/Dockerfile.opencode`):
same hardening, plus the CLI and the network, because a tool-using agent cannot
reach a provider without both. The key is passed by env **name**, never in the
argv and never in a mounted config. The moment the agent finishes, grading moves
to the network-less image.

**Runs are repeated 3×** per task (`reps` in `runner/config.json`). A task's `pass@1` is the share of those runs that pass; its LOC only counts once that share reaches 0.6. A solution that passes one time in three is not a solution you can rely on, so its line count is not evidence of anything.

---

## Run it

```bash
# 1. Sandbox image (once, ~45 MB)
docker build -t slopbench-sandbox sandbox/

# 2. Offline smoke test with canned fixtures — no API key needed
node runner/run.js && node runner/score.js
node runner/test_score.js && node runner/test_provider.js

# 3. Real run — the free roster is in runner/config.json, the key in
#    runner/providers.json. A Zen key comes from https://opencode.ai/auth
export OPENCODE_API_KEY=sk-...
node runner/run.js && node runner/score.js

# 4. Watch it live
node runner/monitor.js --watch

# 5. View the leaderboard
python3 -m http.server 8000
# → http://localhost:8000
```

A scheduled GitHub Action runs `data/` every day and commits it. Daily, because the
free tier caps how many agent runs one account gets: a sweep finishes the models it
can and the next one resumes from `data/raw.json`. The repository stays static: no backend, no database, no accounts.

### Providers

`runner/providers.json` holds the endpoint and the name of the env var that carries
the key. A model can override the config-wide `provider`, so a future paid run can
sit next to the free one; today there is exactly one entry, OpenCode Zen, and one
key, `OPENCODE_API_KEY`. Getting the wiring wrong fails as a 400 that reads like a
bad model, which is why `runner/test_provider.js` checks every config offline.

The live roster is Zen's free tier (`*-free`): OpenCode absorbs the cost, so a full
sweep is free but rate-limited. Without the key the scheduled job skips instead of
going red.

---

## Add a model

```json
{ "id": "glm-5.3-flash-free" }
```

in `runner/config.json → models`. That's it. Free-tier models work but will rate-limit; the runner retries with exponential backoff and records `api_error` entries rather than aborting the run.

## Add a task

A directory under `tasks/` with four files:

| file | purpose |
|---|---|
| `task.md` | the exact prompt. Be airtight: signatures, error messages, worked examples. |
| `reference/solution.py` | the minimal solution. This defines the denominator. |
| `tests/test_solution.py` | pytest. Imports `solution`. No network, no fixtures. |
| `task.json` | `{"id": "...", "language": "python", "entry": "solution.py", "test_cmd": "python -m pytest -q"}` |

Contested reference solution? Open a PR. We change the denominator if the argument is good. That's the point.

---

## What this is not

- **Not a code-quality metric.** LOC is gameable. Long average line length is flagged; a blind rubric grader is on the roadmap. We mitigate, we don't solve.
- **Not a claim that "less is always better."** A 40-line solution with clear intent beats a 12-line puzzle. But 40 lines *for a 12-line task* is the failure mode we're naming.
- **Not a leaderboard for the "best model."** The best model depends on your task. SlopBench is one axis, and only one.
- **Not affiliated with any model vendor.** Zero sponsorship, zero API-key kickbacks.

---

## Honesty

- Reference LOC is a human choice. Ours are committed and contestable.
- Free-tier models change availability without notice. Every result is a dated snapshot — see `generated_at` in `results.json`.
- Token counts are **not** compared across models (different tokenizers). LOC is the only cross-model unit that means the same thing.
- If you think a task is unfair, add a task that's fairer. The suite is designed to grow.

---

## Why this exists

Agentic coding tools are getting faster every month. The number of lines they ship is going up with them. Nobody is publishing the ratio.

SlopBench is a 5-task benchmark run for the price of a coffee, with all raw data checked in, so anyone can cite a number and anyone can contest it. It will be wrong about your favorite model. That's the deal.

---

## License

MIT. Data is public domain. Reference solutions are MIT. Use the numbers, argue with them, publish them.

---

_PRs welcome. Issues about the metric are the most welcome._