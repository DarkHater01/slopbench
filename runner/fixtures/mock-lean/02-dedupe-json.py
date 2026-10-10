```python
def dedupe(records, key):
    seen = set()
    out = []
    for r in records:
        if key not in r:
            continue
        k = r[key]
        if k in seen:
            continue
        seen.add(k)
        out.append(r)
    return out
```
