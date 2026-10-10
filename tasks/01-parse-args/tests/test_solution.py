from solution import parse_args


def test_defaults_when_empty():
    spec = {"flags": ["verbose"], "options": {"out": "a.txt"}}
    assert parse_args([], spec) == {"verbose": False, "out": "a.txt"}


def test_flag_true_and_option_value():
    spec = {"flags": ["verbose"], "options": {"out": "a.txt"}}
    r = parse_args(["--verbose", "--out", "x.txt"], spec)
    assert r == {"verbose": True, "out": "x.txt"}


def test_unknown_argument_raises():
    import pytest
    spec = {"flags": [], "options": {}}
    with pytest.raises(ValueError, match="unknown argument: --nope"):
        parse_args(["--nope"], spec)


def test_missing_value_raises():
    import pytest
    spec = {"flags": [], "options": {"out": "a.txt"}}
    with pytest.raises(ValueError, match="missing value for: --out"):
        parse_args(["--out"], spec)


def test_last_occurrence_wins():
    spec = {"flags": [], "options": {"out": "a.txt"}}
    r = parse_args(["--out", "1.txt", "--out", "2.txt"], spec)
    assert r == {"out": "2.txt"}
