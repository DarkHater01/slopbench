# Task: parse-args

Write a single file `solution.py` in Python 3.11+ using **only the standard library**.

Implement exactly this function:

```python
def parse_args(argv: list, spec: dict) -> dict
```

`spec` has the shape `{"flags": ["a", "b"], "options": {"name": default, ...}}`.

Rules:
- Spec names are written **without** the `--` prefix; CLI tokens always carry it.
  A token `--name` matches spec name `name`.
- Every name in `spec["flags"]` maps to a boolean: `True` if the matching token
  appears in `argv`, otherwise `False` (default).
- Every name in `spec["options"]` takes the token immediately after its matching
  token in `argv` as its string value. If that token never appears, use the
  default from the spec. If the option token appears but has no following token,
  raise `ValueError("missing value for: <token>")`.
- If an option token appears more than once, the last occurrence wins.
- Any token that is neither a flag nor an option raises
  `ValueError("unknown argument: <token>")`.
- The returned dict contains every flag and option name, exactly once each.

Examples:
```python
parse_args(["--verbose", "--out", "x.txt"], {"flags": ["verbose"], "options": {"out": "a.txt"}})
# -> {"verbose": True, "out": "x.txt"}

parse_args([], {"flags": ["verbose"], "options": {"out": "a.txt"}})
# -> {"verbose": False, "out": "a.txt"}
```

Constraints:
- Single file, no prints, no `if __name__ == "__main__"` block, no docstrings required.
- Respond with ONLY one ```python code block containing the complete file.
