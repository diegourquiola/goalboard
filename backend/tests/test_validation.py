import pytest
from pydantic import ValidationError
from models.schemas import LeagueCode, MatchQuery


def test_valid_league():
    lc = LeagueCode(code="pl")
    assert lc.code == "PL"


def test_invalid_league():
    with pytest.raises(ValidationError):
        LeagueCode(code="XYZ")


def test_valid_match_query():
    mq = MatchQuery(league="PL", matchday=5, status="finished")
    assert mq.status == "FINISHED"


def test_invalid_status():
    with pytest.raises(ValidationError):
        MatchQuery(league="PL", status="BANANA")


def test_matchday_and_date_from_mutually_exclusive():
    with pytest.raises(ValidationError):
        MatchQuery(league="PL", matchday=3, date_from="2024-09-01")


def test_date_to_before_date_from_rejected():
    with pytest.raises(ValidationError):
        MatchQuery(league="PL", date_from="2024-09-10", date_to="2024-09-01")


def test_date_to_equals_date_from_is_valid():
    mq = MatchQuery(league="PL", date_from="2024-09-01", date_to="2024-09-01")
    assert mq.date_from == "2024-09-01"


def test_empty_query_is_valid():
    mq = MatchQuery(league="PL")
    assert mq.matchday is None
    assert mq.date_from is None
