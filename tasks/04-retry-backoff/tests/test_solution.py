from solution import retry


def test_success_first_try_no_sleep():
    seen = []
    assert retry(lambda: "ok", attempts=3, sleep=seen.append) == "ok"
    assert seen == []


def test_success_second_try():
    seen = []
    n = {"i": 0}

    def flaky():
        n["i"] += 1
        if n["i"] < 2:
            raise RuntimeError("boom")
        return "done"

    assert retry(flaky, attempts=3, delay=1.0, sleep=seen.append) == "done"
    assert seen == [1.0]


def test_backoff_doubles():
    seen = []
    n = {"i": 0}

    def flaky():
        n["i"] += 1
        if n["i"] < 3:
            raise RuntimeError("boom")
        return "done"

    assert retry(flaky, attempts=3, delay=1.0, sleep=seen.append) == "done"
    assert seen == [1.0, 2.0]


def test_exhausted_reraises_last():
    import pytest
    seen = []
    last = {"e": None}

    def bad():
        try:
            raise ValueError(f"fail-{last['e']}")
        except ValueError as e:
            last["e"] = str(e)
            raise

    with pytest.raises(ValueError, match="fail-"):
        retry(bad, attempts=2, sleep=seen.append)
    assert len(seen) == 1


def test_attempts_validation():
    import pytest
    with pytest.raises(ValueError, match="attempts must be >= 1"):
        retry(lambda: 1, attempts=0)
