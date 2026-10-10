# Task: dedupe-json

Write a single file `solution.py` in Python 3.11+ using **only the standard library**.

Implement exactly this function:

```python
def dedupe(records: list, key: str) -> list
```

`records` is a list of dicts; `key` is a string.

Rules:
- Keep the **first** record for each distinct value of `record[key]`.
- Preserve the original order of the kept records.
- Records that do not contain `key` are **dropped**.
- Values used for deduplication must be hashable; you may assume they are.

Examples:
```python
dedupe([{"id": 1, "n": "a"}, {"id": 2, "n": "b"}, {"id": 1, "n": "c"}], "id")
# -> [{"id": 1, "n": "a"}, {"id": 2, "n": "b"}]

dedupe([{"id": 1}, {"n": "x"}], "id")
# -> [{"id": 1}]

dedupe([], "id")
# -> []
```

Constraints:
- Single file, no prints, no `if __name__ == "__main__"` block, no docstrings required.
- Respond with ONLY one ```python code block containing the complete file.
