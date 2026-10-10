# Task: csv-merge

Write a single file `solution.py` in Python 3.11+ using **only the standard library**
(`csv` and `io` are expected).

Implement exactly this function:

```python
def merge_csv(left_csv: str, right_csv: str, on: str) -> list
```

Both inputs are full CSV texts (header row first). The function performs a
**left join** on the column `on`:

Rules:
- Parse both texts with the `csv` module; the first row is the header.
- If `on` is not a column of either side, raise `ValueError("missing column: <on>")`.
- Build a lookup from the right side keyed by the `on` value; if the same key
  appears more than once on the right, the **first** row wins.
- Each output row starts as the left row's dict (header order). If a right row
  matches, add every right column except `on`; a right column that shares a
  name with a left column **overrides** the left value.
- Right-side columns appear in the output only for matched rows.
- `on` appears exactly once per output row (the left value).
- Rows with no match are kept, without right-side keys.
- Return the list of dicts; empty left body returns `[]`.

Example:
```python
left = "id,name\n1,Ana\n2,Bo\n"
right = "id,city\n1,MAD\n3,BCN\n"
merge_csv(left, right, "id")
# -> [{"id": "1", "name": "Ana", "city": "MAD"},
#     {"id": "2", "name": "Bo"}]
```

Constraints:
- Single file, no prints, no `if __name__ == "__main__"` block, no docstrings required.
- Respond with ONLY one ```python code block containing the complete file.
