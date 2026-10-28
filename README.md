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
| poolside/laguna-s-2.1:free | 1 | 1.2× | 1.1× | −1.8 LOC |
| poolside/laguna-xs-2.1:free | 0 | — | — | — |
| nvidia/nemotron-3-ultra-550b-a55b:free | 0 | — | — | — |
| nvidia/nemotron-3.5-lightning:free | 0 | — | — | — |
<!-- LEADERBOARD:end -->

_Snapshot generated weekly by [GitHub Actions](.github/workflows/bench.yml) at `data/results.json`. Previous snapshots are in git history._

![live leaderboard](docs/screenshot.png)

---

## Models

Three different things, kept apart on purpose: what OpenCode recommends, what the
catalog says about those models, and what an adjacent benchmark scored on its own
tasks. Only the first two are facts about the models; the third is somebody
else's measurement and is labelled as such.

### What OpenCode recommends

OpenCode's own [Models page](https://opencode.ai/docs/models/) lists six
recommended models. There is no public data on "the most used models in
OpenCode", so this is the honest proxy: a vendor-curated shortlist, not usage
counts.

| model | id | context | $/1M in–out |
|---|---|---|---|
| GPT 5.2 | `openai/gpt-5.2` | 400k | 1.75 / 14 |
| GPT 5.1 Codex | `opencode/gpt-5.1-codex` | 400k | 1.07 / 8.5 |
| Claude Opus 4.5 | `anthropic/claude-opus-4-5` | 200k | 5 / 25 |
| Claude Sonnet 4.5 | `anthropic/claude-sonnet-4-5` | 200k | 3 / 15 |
| Minimax M2.1 | `minimax/MiniMax-M2.1` | 205k | 0.3 / 1.2 |
| Gemini 3 Pro | `opencode/gemini-3-pro` | 1M | 2 / 12 |

`gpt-5.1-codex` and `gemini-3-pro` only exist under the `opencode` (Zen) provider
in the catalog — the native `openai` and `google` entries ship later Codex and
Gemini 3.x models instead.

### The roster

The 20 models below are the roster an adjacent benchmark runs (see
[Provenance](#provenance)). Names, ids and variants come from its `models.json`;
context window, price and reasoning control come from the
[models.dev](https://models.dev/api.json) catalog as of **2026-10-27**.

| model | id | context | $/1M in–out | reasoning |
|---|---|---|---|---|
| DeepSeek V4 Pro (New) | `opencode-go/deepseek-v4-pro` | 1M | 0.66 / 1.98 | effort max |
| DeepSeek V4.1 Flash | `opencode-go/deepseek-v4.1-flash` | 1M | 0.15 / 0.6 | effort max |
| GLM-5.3 | `opencode-go/glm-5.3` | 1M | 1.4 / 4.4 | effort max |
| GLM-5.3-Flash | `opencode-go/glm-5.3-flash` | 1M | 0.15 / 0.5 | effort max |
| GPT-5.6 Luna | `opencode-go/gpt-5.6-luna` | 1.1M | 0.2 / 1.2 | effort max |
| Grok 4.6 | `opencode/grok-4.6` | 500k | 2 / 6 | effort xhigh |
| Hy4 preview | `opencode-go/hy4-preview` | 1M | 0.834 / 2.501 | effort high |
| Kimi K2.7 Code | `opencode-go/kimi-k2.7-code` | 262k | 0.95 / 4 | toggle |
| Kimi K3 | `opencode-go/kimi-k3` | 1M | 3 / 15 | effort max |
| LongCat-2.0 | `opencode-go/longcat-2.0` | 1M | 0.3 / 1.2 | toggle |
| MiMo V2.5 | `opencode-go/mimo-v2.5` | 1M | 0.14 / 0.28 | toggle |
| MiMo V2.5 Pro | `opencode-go/mimo-v2.5-pro` | 1M | 0.435 / 0.87 | toggle |
| MiniMax-M2.7 | `opencode-go/minimax-m2.7` | 205k | 0.3 / 1.2 | toggle |
| MiniMax-M3 | `opencode-go/minimax-m3` | 1M | 0.3 / 1.2 | toggle |
| Muse Spark 1.3 Contributor | `opencode-go/muse-spark-1.3-contributor` | 1M | 0.1 / 0.2 | effort xhigh |
| Qwen3.6 Plus | `alibaba/qwen3.6-plus` | 1M | 0.5 / 3 | toggle |
| Qwen3.7 Max | `alibaba/qwen3.7-max` | 1M | 2.5 / 7.5 | toggle |
| Qwen3.7 Plus | `opencode-go/qwen3.7-plus` | 1M | 0.4 / 1.6 | toggle |
| Qwen3.8 Flash | `opencode-go/qwen3.8-flash` | 1M | 0.15 / 0.47 | effort xhigh |
| Qwen3.8 Max | `opencode-go/qwen3.8-max` | 1M | 2 / 6 | effort xhigh |

Two ids moved between the reference's run and this snapshot: `qwen3.6-plus` and
`qwen3.7-max` are no longer listed under `opencode-go`, so the vendor entry is
used. The `alibaba-token-plan` entries report `0 / 0` cost and are not a price.

### Adjacent results — not ours

> The scores below belong to
> [rldona/opencode-models-benchmarks](https://github.com/rldona/opencode-models-benchmarks),
> a different benchmark, on a different task (an RRULE expander in TypeScript),
> with a different metric (a weighted 0–10 rubric judged by `claude:sonnet`,
> 19 hidden cases). **They are not SlopBench results.** No inflation figure can be
> derived from them, and they must not be compared against the leaderboard above.

| # | model | variant | score | hidden | $/task | time |
|---|---|---|---|---|---|---|
| 1 | DeepSeek V4.1 Flash | `max` | 9.8 | 19/19 | 0.0300 | 3m 30s |
| 2 | Hy4 preview | `high` | 9.8 | 19/19 | 0.24 | 12m 29s |
| 3 | GLM-5.3 | `max` | 9.8 | 19/19 | 0.58 | 15m 20s |
| 4 | GPT-5.6 Luna | `max` | 9.6 | 19/19 | 0.0677 | 6m 12s |
| 5 | GLM-5.3-Flash | `max` | 9.6 | 19/19 | 0.0797 | 10m 32s |
| 6 | Qwen3.8 Flash | `xhigh` | 9.5 | 18/19 | 0.14 | 26m 02s |
| 7 | DeepSeek V4 Pro (New) | `max` | 9.4 | 19/19 | 0.0813 | 6m 47s |
| 8 | Grok 4.6 | `xhigh` | 9.2 | 19/19 | 0.44 | 7m 56s |
| 9 | MiniMax-M3 | `thinking` | 9.1 | 17/19 | 0.15 | 6m 49s |
| 10 | Kimi K2.7 Code | `default` | 8.9 | 18/19 | 0.19 | 8m 41s |
| 11 | Kimi K3 | `max` | 8.9 | 16/19 | 0.48 | 11m 00s |
| 12 | MiMo V2.5 | `default` | 8.7 | 16/19 | 0.0168 | 5m 11s |
| 13 | Qwen3.7 Max | `default` | 8.6 | 17/19 | 0.46 | 4m 45s |
| 14 | Qwen3.7 Plus | `default` | 8.5 | 17/19 | 0.14 | 7m 30s |
| 15 | MiMo V2.5 Pro | `default` | 8.2 | 13/19 | 0.0485 | 7m 33s |
| 16 | Muse Spark 1.3 Contributor | `xhigh` | 8.1 | 14/19 | 0.0110 | 3m 41s |
| 17 | LongCat-2.0 | `high` | 7.9 | 17/19 | 0.11 | 20m 53s |
| 18 | Qwen3.6 Plus | `default` | 7.3 | 13/19 | 0.18 | 4m 15s |
| 19 | Qwen3.8 Max | `xhigh` | 6.3 | 19/19 | 0.84 | 28m 30s |
| 20 | MiniMax-M2.7 | `default` | 5.5 | 9/19 | 0.20 | 30m 52s |

Transcribed from that project's README on 2026-10-27; decimal separators
normalised. `Qwen3.8 Max` was stopped by hand at ~70 % and scored on what it had
produced — the original notes it with an asterisk.

### Why there is no 0–10 column here

That benchmark collapses correctness, autonomy, own tests, code quality and
robustness into one number with fixed weights. It works for ranking models on one
task. It cannot say anything about waste, because LOC is not in the rubric: a
9.8-scoring solution can be three times longer than the reference and still score
9.8. SlopBench keeps `pass@1` and `inflation` as separate axes and ranks with a
Pareto frontier, precisely so no weighting decision can hide a sloppy solution.
See [ADR-001](docs/adr/ADR-001-metric.md).

## Provenance

| data | source | taken on |
|---|---|---|
| recommended models | <https://opencode.ai/docs/models/> | 2026-10-27 |
| context, price, reasoning | <https://models.dev/api.json> (232 providers) | 2026-10-27 |
| 20-model roster and adjacent scores | [rldona/opencode-models-benchmarks](https://github.com/rldona/opencode-models-benchmarks) · [site](https://rldona.github.io/opencode-models-benchmarks/) | 2026-10-27 |

Catalog data is a snapshot: providers re-price and re-point ids without notice.
Re-fetch `models.dev` before quoting a price.

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
runner/run.js        model × task × variant × rep → OpenRouter → Docker sandbox → data/raw.json
runner/score.js      aggregates raw.json → data/results.json (throws on inconsistent input)
runner/test_score.js self-test of the scorer (no API required)
index.html           interactive leaderboard: pass@1 vs waste with a Pareto
                     frontier, sortable table, per-task breakdown and a dated
                     model catalog. Reads data/results.json at load time.
                     No backend, no framework.
```

Every generated solution runs inside a container with:

- `--network none`
- `--read-only` root filesystem
- `--user 1000:1000` (non-root)
- `--memory 512m --cpus 1 --pids-limit 128`
- 50-second timeout

Code written by models is treated as hostile. It never touches the host.

**Runs are repeated 5×** per task (configurable in `runner/config.json`). If a model can't pass 5 out of 5, its `pass@5` is reported as `false` and its LOC is discarded — a solution you can't rely on isn't a solution you should count.

---

## Run it

```bash
# 1. Sandbox image (once, ~45 MB)
docker build -t slopbench-sandbox sandbox/

# 2. Offline smoke test with canned fixtures — no API key needed
node runner/run.js && node runner/score.js
node runner/test_score.js

# 3. Real run — pick your models in runner/config.json
export OPENROUTER_API_KEY=sk-or-...
node runner/run.js && node runner/score.js

# 4. Watch it live
node runner/monitor.js --watch

# 5. View the leaderboard
python3 -m http.server 8000
# → http://localhost:8000
```

A scheduled GitHub Action regenerates `data/` every Monday and commits it. The repository stays static: no backend, no database, no accounts.

---

## Add a model

```json
{ "id": "z-ai/glm-5.3-flash" }
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
- Free-tier models change availability weekly. Every result is a dated snapshot — see `generated_at` in `results.json`.
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