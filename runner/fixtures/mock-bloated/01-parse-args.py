```python
class ArgSpec:
    def __init__(self, flags, options):
        self.flags = list(flags)
        self.options = dict(options)

    def has_flag(self, token):
        return token.startswith("--") and token[2:] in self.flags

    def has_option(self, token):
        return token.startswith("--") and token[2:] in self.options


class ArgParseError(ValueError):
    pass


def parse_args(argv, spec):
    spec_obj = ArgSpec(spec.get("flags", []), spec.get("options", {}))
    result = {}
    for f in spec_obj.flags:
        result[f] = False
    for name, default in spec_obj.options.items():
        result[name] = default
    index = 0
    while index < len(argv):
        token = argv[index]
        if spec_obj.has_flag(token):
            result[token[2:]] = True
            index = index + 1
            continue
        if spec_obj.has_option(token):
            if index + 1 >= len(argv):
                raise ArgParseError(f"missing value for: {token}")
            result[token[2:]] = argv[index + 1]
            index = index + 2
            continue
        raise ArgParseError(f"unknown argument: {token}")
    return result
```