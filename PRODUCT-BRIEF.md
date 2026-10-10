# PRODUCT-BRIEF: SlopBench

## Who is this for?
Developers who use LLM agents to write code and are tired of inflated, over-engineered
output. Secondary: model vendors and benchmark watchers who want an honest, reproducible
"how much bloat does this model add" number.

## The pain (quantified)
Agent-written PRs routinely arrive 5–20x larger than the hand-written equivalent.
Review cost scales with LOC. Today nobody publishes a comparable, test-anchored number
for this — code benchmarks measure correctness only (HumanEval, SWE-bench), not bloat.

## Why now?
Agent coding went mainstream; code inflation is now the default failure mode.
Correctness-only benchmarks reward verbose solutions.

## The 10-star version
A public, auto-updated leaderboard: for every model — pass@1/pass@5 on a fixed task
suite, inflation factor (LOC generated ÷ LOC of the reference solution that passes the
same tests), and how much a minimalism system prompt shrinks its output.

## MVP (this repo)
- 5 Python tasks, each with an airtight spec, hand-written reference solution, pytest suite.
- Runner: OpenRouter → sandboxed Docker execution (no network, non-root, resource caps).
- Two variants per model: `vanilla` vs `minimal` system prompt.
- Static leaderboard (`index.html` reading `data/results.json`), weekly GitHub Action.

## Anti-goals (explicitly NOT building)
- No SaaS, no accounts, no API of our own.
- No multi-language support in v1 (Python only).
- No dynamic frontend framework, no database, no backend.
- No claim that "less code is always better" — inflation only counts for runs that pass.

## Success metric
Not stars. Evidence of use: external forks/PRs adding tasks or models, and citations of
the inflation numbers in discussions. Virality is a byproduct of the data being
arguable, not a goal we can engineer.

## Go/No-Go
GO — cheap to run (free-tier models), zero infra, and the metric is falsifiable:
anyone can clone, run, and contest the numbers.
