from solution import merge_csv

LEFT = "id,name\n1,Ana\n2,Bo\n"
RIGHT = "id,city\n1,MAD\n3,BCN\n"


def test_basic_left_join():
    assert merge_csv(LEFT, RIGHT, "id") == [
        {"id": "1", "name": "Ana", "city": "MAD"},
        {"id": "2", "name": "Bo"},
    ]


def test_no_match_keeps_row_without_right_keys():
    left = "id,name\n9,Zo\n"
    assert merge_csv(left, RIGHT, "id") == [{"id": "9", "name": "Zo"}]


def test_duplicate_right_key_first_wins():
    right = "id,city\n1,AAA\n1,BBB\n"
    out = merge_csv(LEFT, right, "id")
    assert out[0]["city"] == "AAA"


def test_right_overrides_same_name_column():
    right = "id,name\n1,RIGHT\n"
    out = merge_csv(LEFT, right, "id")
    assert out[0] == {"id": "1", "name": "RIGHT"}


def test_missing_column_raises():
    import pytest
    with pytest.raises(ValueError, match="missing column: nope"):
        merge_csv(LEFT, RIGHT, "nope")


def test_empty_left_body():
    assert merge_csv("id,name\n", RIGHT, "id") == []
