from solution import dedupe


def test_first_occurrence_wins_and_order_preserved():
    recs = [{"id": 1, "n": "a"}, {"id": 2, "n": "b"}, {"id": 1, "n": "c"}]
    assert dedupe(recs, "id") == [{"id": 1, "n": "a"}, {"id": 2, "n": "b"}]


def test_missing_key_dropped():
    recs = [{"id": 1}, {"n": "x"}, {"id": 3}]
    assert dedupe(recs, "id") == [{"id": 1}, {"id": 3}]


def test_empty_input():
    assert dedupe([], "id") == []


def test_no_duplicates_returns_all():
    recs = [{"id": 1}, {"id": 2}, {"id": 3}]
    assert dedupe(recs, "id") == recs
