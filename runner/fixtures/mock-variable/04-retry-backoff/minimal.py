```python
import time


def retry(fn, attempts=3, delay=0.0, sleep=time.sleep):
    if attempts < 1:
        raise ValueError("attempts must be >= 1")
    for i in range(attempts):
        try:
            return fn()
        except Exception:
            if i == attempts - 1:
                raise
            sleep(delay * 2 ** i)
```
