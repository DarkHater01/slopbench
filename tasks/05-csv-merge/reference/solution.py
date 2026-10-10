import csv
import io


def merge_csv(left_csv, right_csv, on):
    def rows(text):
        r = list(csv.reader(io.StringIO(text)))
        return r[0], r[1:]
    lh, lr = rows(left_csv)
    rh, rr = rows(right_csv)
    if on not in lh or on not in rh:
        raise ValueError(f"missing column: {on}")
    right = {}
    for row in rr:
        d = dict(zip(rh, row))
        right.setdefault(d[on], d)
    out = []
    for row in lr:
        d = dict(zip(lh, row))
        m = right.get(d[on])
        if m:
            for k in rh:
                if k != on:
                    d[k] = m[k]
        out.append(d)
    return out
