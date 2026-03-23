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
