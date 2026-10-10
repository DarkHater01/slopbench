```python
import time


class RetryPolicy:
    def __init__(self, attempts, delay):
        if attempts < 1:
            raise ValueError("attempts must be >= 1")
        self.attempts = attempts
        self.delay = delay

    def sleep_for(self, i, sleep):
        if i == self.attempts - 1:
            return False
        sleep(self.delay * 2 ** i)
        return True


def retry(fn, attempts=3, delay=0.0, sleep=time.sleep):
    policy = RetryPolicy(attempts, delay)
    for i in range(policy.attempts):
        try:
            return fn()
        except Exception:
            if not policy.sleep_for(i, sleep):
                raise
```
