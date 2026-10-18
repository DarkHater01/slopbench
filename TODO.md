# TODO — slopbench

Context: **14 stars, 2 forks — 14× its sibling `tokentax` (1 star).** It is the repo
with an audience, and the one with the cheapest wins: two of the items below are
CRITICAL and one of them has already published a wrong row in the README.

Rule for this file: **A and B were fixed first**, each with the check that keeps it
fixed. Nothing new gets added before C.

## A. The offline test is broken on a fresh clone (CRITICAL) ✅ CLOSED

Fixed: `runner/test_score.js` reads the committed `data/raw.mock.json` and writes
into `runner/tmp/`. A test no longer reads a file a job writes.

- [x] `node runner/test_score.js` **fails on a clean checkout**: *"expected 40
      groups, got 20"*. Cause: `data/raw.json` is simultaneously the mock fixture the
      test reads (`runner/test_score.js:10`) and the live output the weekly job writes
      and commits (`runner/run.js:12,244`, `runner/score.js:8`,
      `.github/workflows/bench.yml:39,49`). CI overwrote the fixture with 2 live
      models, so the assertion can never hold again. `data/test-results.json` is a
      test artifact written into the committed `data/` dir too.
      *Fix:* commit an immutable `data/raw.mock.json` (or build the fixture in
      `runner/tmp/`) and point the test there; never let a test read a file a job writes.

## B. Grading has been marking correct solutions as failures (CRITICAL) ✅ CLOSED

Fixed: `--user` follows the host uid/gid. **The row itself is still wrong** until
the next run: do not edit it by hand.

- [x] `--user 1000:1000` is hardcoded (`runner/run.js:129`), so when the host uid is
      not 1000 (CI) the container cannot write `/job/out.xml` and every solution is
      graded as failing. This is a published-number bug, not a cosmetic one: the
      `nemotron … 0` row in the README is an artifact of it, not a model result.
      *Fix:* `--user ${process.getuid()}:${process.getgid()}` (see `tokentax`
      `runner/sandbox.js`), then re-run after the fix or mark the row `pending`.

## C. Nothing verifies the things the README promises

- [ ] **The README table is hand-typed and 5 days stale.** There is no
      `<!-- LEADERBOARD:START/END -->` block at all: the rows were typed by hand,
      while the committed `data/results.json` says `generated_at 2026-10-13` and the
      newer `data/raw.json` was never scored. Three of the four rows are zeros that
      only say "we did not get a result from this model". Fix: port
      `runner/leaderboard.js` from the sibling repo and render the block, so a
      number in the README can only come from a scored run.
- [ ] **No CI at all** on push/PR (only `bench.yml`), which is how A stayed broken.
      Added `ci.yml` running `node runner/test_score.js` on push and pull_request.
- [ ] **No check that the reference solution passes its own hidden tests.** The
      denominator and every task are used unvalidated (`runner/score.js:47`).
      *Fix:* a `runner/test_tasks.js` with the `tokentax` pattern — the broken
      workspace must fail, the reference must pass.
- [ ] `pass@5` is promised in the README (`README.md:78`) and never computed;
      `results.json` has no such field. Compute it or delete the claim.
- [ ] *"Long average line length is flagged"* (`README.md:133`) does not exist:
      `isSuspicious` only regexes `exec`/`eval`. Implement it or delete the sentence.
- [ ] The prose says *"5 of 5"* while the code thresholds at 0.6
      (`README.md:78` vs `runner/score.js:111`). Pick one.

## D. Adoption surface (the cheap stars)

- [ ] **No topics and no homepage** on the GitHub repo, while `tokentax` has 7 topics.
      Five minutes, real discovery value.
- [ ] **No `CONTRIBUTING.md`, no issue templates, no PR template.** `tokentax` has the
      same hole; a benchmark lives on outsider contributions.
- [ ] `index.html` exists but is not linked as the repo homepage, and the README shows
      a screenshot instead. Point Pages at it.
- [ ] Adding a model is config-only but OpenRouter-only — no provider registry.
      Adopt `tokentax`'s `runner/providers.json` (base URL + key env + pacing) so
      Groq/OpenAI/Anthropic are one JSON entry each.

## E. Consistency with its sibling (pick a direction, then share code)

- [ ] **Hidden tests are copied inside the job** (`runner/run.js:166`) so the agent can
      read them; `tokentax` mounts them `:ro` only at grading time. Port that.
- [ ] `task.json.language` is decorative — `run.js` always runs `python -m pytest`.
      Honour it or drop the field.
- [ ] Decide the shared foundation: `providers.json`, a self-test per module wired
      into CI, and the static-leaderboard renderer are already written twice. Either
      `tokentax` becomes the engine and `slopbench` a task pack, or the two share code
      deliberately. Two divergent copies of the same metric is the worst outcome.

**Borrow list (slopbench already has, tokentax lacks):** `index.html`,
`PRODUCT-BRIEF.md`, `docs/demo.gif`, `docs/demo.tape`, `docs/screenshot.png`,
`docs/social.html`, `docs/social-preview.png`, `runner/demo.js`, `runner/monitor.js`.
