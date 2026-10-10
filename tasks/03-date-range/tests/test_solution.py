from solution import date_range


def test_basic_range():
    assert date_range("2026-01-30", "2026-02-02") == [
        "2026-01-30", "2026-01-31", "2026-02-01", "2026-02-02"
    ]


def test_single_day():
    assert date_range("2026-03-01", "2026-03-01") == ["2026-03-01"]


def test_end_before_start():
    import pytest
    with pytest.raises(ValueError, match="end before start"):
        date_range("2026-03-10", "2026-03-01")


def test_bad_date():
    import pytest
    with pytest.raises(ValueError, match="bad date: nope"):
        date_range("nope", "2026-03-01")


def test_invalid_calendar_day():
    import pytest
    with pytest.raises(ValueError, match="bad date"):
        date_range("2026-02-30", "2026-03-01")
