# Task: date-range

Write a single file `solution.py` in Python 3.11+ using **only the standard library**
(`datetime` is expected).

Implement exactly this function:

```python
def date_range(start: str, end: str) -> list
```

Rules:
- `start` and `end` are date strings in ISO format `YYYY-MM-DD`.
- Return the list of every date from `start` to `end` **inclusive**, as ISO
  strings, in ascending order.
- If `end` is before `start`, raise `ValueError("end before start")`.
- If a date string cannot be parsed, raise `ValueError("bad date: <the string>")`.

Examples:
```python
date_range("2026-01-30", "2026-02-02")
# -> ["2026-01-30", "2026-01-31", "2026-02-01", "2026-02-02"]

date_range("2026-03-01", "2026-03-01")
# -> ["2026-03-01"]

date_range("2026-03-10", "2026-03-01")
# raises ValueError("end before start")

date_range("nope", "2026-03-01")
# raises ValueError("bad date: nope")
```

Constraints:
- Single file, no prints, no `if __name__ == "__main__"` block, no docstrings required.
- Respond with ONLY one ```python code block containing the complete file.
