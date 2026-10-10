```python
import csv
import io


def _read(text):
    rows = list(csv.reader(io.StringIO(text)))
    return rows[0], rows[1:]


def _index(header, rows, on):
    idx = {}
    for row in rows:
        d = dict(zip(header, row))
        key = d.get(on)
        if key is not None and key not in idx:
            idx[key] = d
    return idx


def _merge_row(left, right_row, right_keys, on):
    base = dict(left)
    if right_row is None:
        return base
    for k in right_keys:
        if k == on:
            continue
        base[k] = right_row[k]
    return base


def merge_csv(left_csv, right_csv, on):
    lh, lr = _read(left_csv)
    rh, rr = _read(right_csv)
    if on not in lh or on not in rh:
        raise ValueError(f"missing column: {on}")
    right = _index(rh, rr, on)
    out = []
    for row in lr:
        left = dict(zip(lh, row))
        match = right.get(left.get(on))
        out.append(_merge_row(left, match, rh, on))
    return out
```