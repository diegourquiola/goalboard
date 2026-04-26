import datetime
import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

MOCK_PL_FIXTURE = {
    "fixture": {
        "id": 100,
        "date": "2026-04-25T15:00:00+00:00",
        "status": {"short": "FT", "elapsed": 90},
        "venue": {"name": "Wembley", "city": "London"},
    },
    "league": {
        "id": 39,
        "name": "Premier League",
        "logo": "https://example.com/pl.png",
        "country": "England",
        "flag": "https://example.com/gb.svg",
    },
    "teams": {
        "home": {"id": 1, "name": "Arsenal", "logo": "https://example.com/ars.png"},
        "away": {"id": 2, "name": "Chelsea", "logo": "https://example.com/che.png"},
    },
    "goals": {"home": 2, "away": 1},
    "statistics": [],
}

MOCK_UNKNOWN_FIXTURE = {
    "fixture": {
        "id": 200,
        "date": "2026-04-25T18:00:00+00:00",
        "status": {"short": "NS", "elapsed": None},
        "venue": {"name": "Stade", "city": "Paris"},
    },
    "league": {
        "id": 999,
        "name": "Ligue 2",
        "logo": "https://example.com/l2.png",
        "country": "France",
        "flag": "https://example.com/fr.svg",
    },
    "teams": {
        "home": {"id": 10, "name": "Lyon B", "logo": ""},
        "away": {"id": 11, "name": "Metz",   "logo": ""},
    },
    "goals": {"home": None, "away": None},
    "statistics": [],
}


def _mock_get(path, params=None, ttl=300):
    return {"response": [MOCK_PL_FIXTURE, MOCK_UNKNOWN_FIXTURE]}


def test_home_matches_returns_featured_and_countries():
    with patch("routers.home._get", side_effect=_mock_get):
        resp = client.get("/api/home/matches?date=2026-04-25")
    assert resp.status_code == 200
    body = resp.json()
    assert "featured" in body
    assert "countries" in body


def test_featured_contains_pl_when_pl_has_matches():
    with patch("routers.home._get", side_effect=_mock_get):
        resp = client.get("/api/home/matches?date=2026-04-25")
    body = resp.json()
    league_ids = [f["league_id"] for f in body["featured"]]
    assert 39 in league_ids


def test_unknown_league_goes_to_countries():
    with patch("routers.home._get", side_effect=_mock_get):
        resp = client.get("/api/home/matches?date=2026-04-25")
    body = resp.json()
    all_country_league_ids = [
        l["league_id"]
        for c in body["countries"]
        for l in c["leagues"]
    ]
    assert 999 in all_country_league_ids


def test_default_date_is_today():
    captured = {}
    def capturing_get(path, params=None, ttl=300):
        captured["params"] = params
        return {"response": []}
    with patch("routers.home._get", side_effect=capturing_get):
        client.get("/api/home/matches")
    assert captured["params"]["date"] == datetime.date.today().isoformat()


def test_empty_date_returns_empty_lists():
    with patch("routers.home._get", return_value={"response": []}):
        resp = client.get("/api/home/matches?date=2000-01-01")
    body = resp.json()
    assert body["featured"] == []
    assert body["countries"] == []
