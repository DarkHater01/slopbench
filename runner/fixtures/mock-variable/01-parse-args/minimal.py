```python
def parse_args(argv, spec):
    flags = spec.get("flags", [])
    options = spec.get("options", {})
    out = {f: False for f in flags}
    out.update(options)
    i = 0
    while i < len(argv):
        t = argv[i]
        if t.startswith("--") and t[2:] in flags:
            out[t[2:]] = True
        elif t.startswith("--") and t[2:] in options:
            if i + 1 >= len(argv):
                raise ValueError(f"missing value for: {t}")
            out[t[2:]] = argv[i + 1]
            i += 1
        else:
            raise ValueError(f"unknown argument: {t}")
        i += 1
    return out```
