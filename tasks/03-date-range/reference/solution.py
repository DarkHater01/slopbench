from datetime import date, timedelta


def date_range(start, end):
    def parse(s):
        try:
            return date.fromisoformat(s)
        except ValueError:
            raise ValueError(f"bad date: {s}")
    a, b = parse(start), parse(end)
    if b < a:
        raise ValueError("end before start")
    return [(a + timedelta(days=i)).isoformat() for i in range((b - a).days + 1)]
