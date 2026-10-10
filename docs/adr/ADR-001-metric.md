# ADR-001: LOC-inflation as the headline metric

Date: 2026-10-10
Status: Accepted

## Context
We need one number that captures "how much a model over-builds". Candidates:
raw SLOC, token count, cyclomatic complexity, dependency count, subjective
readability scoring.

## Decision
Headline metric = **inflation factor**: median LOC (non-blank, non-comment lines)
of the model's `solution.py` across passing runs, divided by the LOC of the
hand-written reference solution that passes the same tests.

Guard rails:
- Inflation is only computed for runs whose test suite passes. Failing runs
  report pass rate only.
- A model must reach pass@1 ≥ 0.6 on a task for its inflation number to count
  on that task; otherwise the task is marked `unqualified` for that model.
- Reliability is reported alongside: pass@1 and pass@5 (5 repetitions).

## Consequences
- LOC is gameable (obfuscated one-liners). We mitigate, not solve: the runner
  flags solutions with abnormally long average line length, and the blind
  rubric grader (second grader) can mark suspicious solutions.
- Reference solutions are hand-written by us; bias is possible. They are
  committed in-repo so anyone can contest them via PR.
- Token counts are not compared across models (different tokenizers); LOC is
  the only cross-model comparable size unit.
