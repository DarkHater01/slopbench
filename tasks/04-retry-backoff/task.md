# Task: retry-backoff

Write a single file `solution.py` in Python 3.11+ using **only the standard library**
(`time` is expected).

Implement exactly this function:

```python
def retry(fn, attempts=3, delay=0.0, sleep=time.sleep)
```

Rules:
- Call `fn()` and return its result on success.
- On exception: if this was the last allowed attempt (there are `attempts` total
  tries), re-raise that exception unchanged. Otherwise call
  `sleep(delay * 2 ** i)` where `i` is the zero-based index of the failed
  attempt, and try again.
- If `attempts < 1`, raise `ValueError("attempts must be >= 1")`.
- `sleep` is injectable for testing (defaults to `time.sleep`); always call the
  injected `sleep`, never `time.sleep` directly.

Examples:
```python
calls = []
retry(lambda: "ok", attempts=3, sleep=calls.append)
# -> "ok", calls == []

tries = {"n": 0}
def flaky():
    tries["n"] += 1
    if tries["n"] < 3:
        raise RuntimeError("boom")
    return "done"
seen = []
retry(flaky, attempts=3, delay=1.0, sleep=seen.append)
# -> "done", seen == [1.0, 2.0]
```

Constraints:
- Single file, no prints, no `if __name__ == "__main__"` block, no docstrings required.
- Respond with ONLY one ```python code block containing the complete file.
