```python
class RecordFilter:
    def __init__(self, key):
        self.key = key
        self.seen = set()
        self.kept = []

    def keep(self, record):
        if self.key not in record:
            return False
        value = record[self.key]
        if value in self.seen:
            return False
        self.seen.add(value)
        self.kept.append(record)
        return True


def dedupe(records, key):
    f = RecordFilter(key)
    for r in records:
        f.keep(r)
    return f.kept
```
