```python
from datetime import date, timedelta


def _parse(s):
    try:
        return date.fromisoformat(s)
    except ValueError:
        raise ValueError(f"bad date: {s}")


def _within(a, b):
    return a <= b


def date_range(start, end):
    a = _parse(start)
    b = _parse(end)
    result = []
    if not _within(a, b):
        raise ValueError("end before start")
    current = a
    while current <= b:
        result.append(current.isoformat())
        current = current + timedelta(days=1)
    return result
```