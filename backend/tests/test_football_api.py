import pytest
from unittest.mock import patch, MagicMock
from services import football_api


@pytest.fixture(autouse=True)
def clear_cache():
    football_api._cache.clear()
    yield
    football_api._cache.clear()


def mock_response(data: dict):
    resp = MagicMock()
    resp.json.return_value = data
    resp.raise_for_status = MagicMock()
    return resp


def test_get_standings_calls_correct_url():
    sample = {
        "response": [{
            "league": {
                "id": 39,
                "name": "Premier League",
                "standings": [[{
                    "rank": 1,
                    "team": {"id": 40, "name": "Liverpool", "logo": ""},
                    "points": 84,
                    "goalsDiff": 45,
                    "all": {"played": 38, "win": 25, "draw": 9, "lose": 4,
                            "goals": {"for": 86, "against": 41}},
                    "form": "DLDLW",
                }]]
            }
        }]
    }
    with patch("services.football_api.httpx.Client") as mock_client_cls:
        mock_client = mock_client_cls.return_value.__enter__.return_value
        mock_client.get.return_value = mock_response(sample)
        result = football_api.get_standings("PL")

    call_args = mock_client.get.call_args
    assert "https://v3.football.api-sports.io/standings" in call_args[0][0]
    assert call_args[1]["params"]["league"] == 39
    assert call_args[1]["params"]["season"] == football_api.CURRENT_SEASON
    # Verify transformed output
    rows = result["stage"][0]["standings"]
    assert len(rows) == 1
    assert rows[0]["team_name"] == "Liverpool"
    assert rows[0]["points"] == 84


def test_get_standings_uses_cache():
    sample = {
        "response": [{
            "league": {
                "id": 39,
                "name": "Premier League",
                "standings": [[]]
            }
        }]
    }
    with patch("services.football_api.httpx.Client") as mock_client_cls:
        mock_client = mock_client_cls.return_value.__enter__.return_value
        mock_client.get.return_value = mock_response(sample)

        football_api.get_standings("PL")
        football_api.get_standings("PL")   # second call — should hit cache

    assert mock_client.get.call_count == 1  # only one real HTTP call


def test_get_matches_with_date_filters():
    sample = {
        "response": [{
            "fixture": {"id": 1, "date": "2024-09-15T15:00:00+00:00",
                        "status": {"long": "Match Finished", "short": "FT", "elapsed": 90}},
            "teams": {"home": {"id": 1, "name": "Team A"}, "away": {"id": 2, "name": "Team B"}},
            "goals": {"home": 2, "away": 1},
        }]
    }
    with patch("services.football_api.httpx.Client") as mock_client_cls:
        mock_client = mock_client_cls.return_value.__enter__.return_value
        mock_client.get.return_value = mock_response(sample)
        result = football_api.get_matches("PL", date_from="2024-09-01", date_to="2024-09-30")

    call_args = mock_client.get.call_args
    params = call_args[1]["params"]
    assert params["league"] == 39
    assert params["from"] == "2024-09-01"
    assert params["to"] == "2024-09-30"
    # Verify transformed output
    matches = result[0]["matches"]
    assert len(matches) == 1
    assert matches[0]["teams"]["home"]["name"] == "Team A"
    assert matches[0]["status"] == "finished"


def test_request_uses_api_key_header():
    """Ensure x-apisports-key header is passed to the HTTP client."""
    sample = {"response": [{"league": {"id": 39, "name": "PL", "standings": [[]]}}]}
    with patch("services.football_api.httpx.Client") as mock_client_cls:
        mock_client = mock_client_cls.return_value.__enter__.return_value
        mock_client.get.return_value = mock_response(sample)
        football_api.get_standings("PL")

    _, kwargs = mock_client_cls.call_args
    assert "x-apisports-key" in kwargs.get("headers", {})


def test_invalid_league_code_raises_error():
    """Test that invalid league codes raise ValueError."""
    with pytest.raises(ValueError, match="Unsupported league code"):
        football_api.get_standings("XYZ")


# ── Task 1 tests ──────────────────────────────────────────────────────────────

def _make_fixture(fixture_id=1, home_id=33, away_id=40, status="FT",
                  venue_name="Wembley", venue_city="London",
                  home_score=2, away_score=1):
    return {
        "fixture": {
            "id": fixture_id,
            "date": "2025-01-01T15:00:00+00:00",
            "status": {"short": status, "elapsed": 90},
            "venue": {"name": venue_name, "city": venue_city},
        },
        "teams": {
            "home": {"id": home_id, "name": "Man United", "logo": "https://logo/33.png"},
            "away": {"id": away_id, "name": "Liverpool",  "logo": "https://logo/40.png"},
        },
        "goals": {"home": home_score, "away": away_score},
        "statistics": [],
    }


def test_parse_fixture_includes_venue():
    from services.football_api import _parse_fixture
    result = _parse_fixture(_make_fixture())
    assert result["venue"]["name"] == "Wembley"
    assert result["venue"]["city"] == "London"


def test_get_league_id_accepts_numeric_string():
    from services.football_api import _get_league_id
    assert _get_league_id("39") == 39


def test_get_league_id_accepts_code():
    from services.football_api import _get_league_id
    assert _get_league_id("PL") == 39


# ── Task 2 tests ──────────────────────────────────────────────────────────────

def test_search_leagues_returns_list():
    from services.football_api import search_leagues
    mock = {
        "response": [
            {
                "league":  {"id": 39, "name": "Premier League", "logo": "https://logo.png"},
                "country": {"name": "England", "flag": "https://flag.png"},
            }
        ]
    }
    with patch("services.football_api._get", return_value=mock):
        result = search_leagues("premier")
    assert len(result) == 1
    assert result[0]["name"] == "Premier League"
    assert result[0]["country"] == "England"


def test_get_h2h_returns_parsed_fixtures():
    from services.football_api import get_h2h
    mock = {"response": [_make_fixture()]}
    with patch("services.football_api._get", return_value=mock):
        result = get_h2h(33, 40)
    assert len(result) == 1
    assert result[0]["score"]["home"] == 2
    assert result[0]["venue"]["name"] == "Wembley"


def test_get_team_last_fixtures_returns_list():
    from services.football_api import get_team_last_fixtures
    mock = {"response": [_make_fixture(), _make_fixture(fixture_id=2)]}
    with patch("services.football_api._get", return_value=mock):
        result = get_team_last_fixtures(33, last=5)
    assert len(result) == 2


def test_get_fixture_lineups_returns_by_team():
    from services.football_api import get_fixture_lineups
    mock = {
        "response": [
            {
                "team": {"id": 33, "name": "Man United", "logo": ""},
                "formation": "4-3-3",
                "startXI": [
                    {"player": {"name": "De Gea"}},
                    {"player": {"name": "Shaw"}},
                ],
            },
            {
                "team": {"id": 40, "name": "Liverpool", "logo": ""},
                "formation": "4-2-3-1",
                "startXI": [
                    {"player": {"name": "Alisson"}},
                ],
            },
        ]
    }
    with patch("services.football_api._get", return_value=mock):
        result = get_fixture_lineups(999)
    assert len(result) == 2
    assert result[0]["team_id"] == 33
    assert result[0]["formation"] == "4-3-3"
    assert "De Gea" in result[0]["players"]


def test_get_team_next_fixture_returns_single():
    from services.football_api import get_team_next_fixture
    mock = {"response": [_make_fixture(status="NS")]}
    with patch("services.football_api._get", return_value=mock):
        result = get_team_next_fixture(33)
    assert result is not None
    assert result["status"] == "pre-match"


def test_get_team_next_fixture_returns_none_when_empty():
    from services.football_api import get_team_next_fixture
    with patch("services.football_api._get", return_value={"response": []}):
        result = get_team_next_fixture(33)
    assert result is None


def test_get_fixture_statistics_returns_two_teams():
    sample = {
        "response": [
            {
                "team": {"id": 33, "name": "Man Utd", "logo": "https://logo.png"},
                "statistics": [
                    {"type": "Shots on Goal", "value": 4},
                    {"type": "Ball Possession", "value": "52%"},
                    {"type": "Yellow Cards", "value": 2},
                    {"type": "Passes %", "value": "89%"},
                    {"type": "Ignored Stat", "value": 99},
                ],
            },
            {
                "team": {"id": 40, "name": "Liverpool", "logo": "https://logo2.png"},
                "statistics": [
                    {"type": "Shots on Goal", "value": 7},
                    {"type": "Ball Possession", "value": "48%"},
                    {"type": "Yellow Cards", "value": None},
                ],
            },
        ]
    }
    with patch("services.football_api.httpx.Client") as mock_client_cls:
        mock_client = mock_client_cls.return_value.__enter__.return_value
        mock_client.get.return_value = mock_response(sample)
        result = football_api.get_fixture_statistics(1234)

    assert len(result) == 2
    assert result[0]["team_id"] == 33
    assert result[0]["stats"]["Shots on Goal"] == 4
    assert result[0]["stats"]["Ball Possession"] == 52   # "52%" → 52
    assert result[0]["stats"]["Passes %"] == 89          # "89%" → 89
    assert "Ignored Stat" not in result[0]["stats"]      # not in STAT_KEYS
    assert result[1]["stats"]["Yellow Cards"] == 0        # None → 0


def test_get_fixture_statistics_handles_empty():
    sample = {"response": []}
    with patch("services.football_api.httpx.Client") as mock_client_cls:
        mock_client = mock_client_cls.return_value.__enter__.return_value
        mock_client.get.return_value = mock_response(sample)
        result = football_api.get_fixture_statistics(9999)
    assert result == []


def test_get_fixture_events_returns_sorted_events():
    sample = {
        "response": [
            {
                "time": {"elapsed": 67, "extra": None},
                "team": {"id": 40, "name": "Liverpool", "logo": "https://logo.png"},
                "player": {"id": 111, "name": "Salah"},
                "assist": {"id": None, "name": None},
                "type": "Card",
                "detail": "Yellow Card",
            },
            {
                "time": {"elapsed": 23, "extra": None},
                "team": {"id": 33, "name": "Man Utd", "logo": "https://logo2.png"},
                "player": {"id": 222, "name": "Rashford"},
                "assist": {"id": 333, "name": "Bruno"},
                "type": "Goal",
                "detail": "Normal Goal",
            },
            {
                "time": {"elapsed": 45, "extra": 2},
                "team": {"id": 33, "name": "Man Utd", "logo": "https://logo2.png"},
                "player": {"id": 444, "name": "Maguire"},
                "assist": {"id": None, "name": None},
                "type": "subst",
                "detail": "Substitution 1",
            },
        ]
    }
    with patch("services.football_api.httpx.Client") as mock_client_cls:
        mock_client = mock_client_cls.return_value.__enter__.return_value
        mock_client.get.return_value = mock_response(sample)
        result = football_api.get_fixture_events(1234)

    assert len(result) == 3
    assert result[0]["minute"] == 23
    assert result[0]["type"] == "Goal"
    assert result[0]["player_name"] == "Rashford"
    assert result[0]["assist_name"] == "Bruno"
    assert result[1]["minute"] == 45
    assert result[1]["extra_minute"] == 2
    assert result[2]["minute"] == 67
    assert result[2]["type"] == "Card"
    assert result[2]["assist_name"] is None


def test_get_fixture_events_handles_empty():
    sample = {"response": []}
    with patch("services.football_api.httpx.Client") as mock_client_cls:
        mock_client = mock_client_cls.return_value.__enter__.return_value
        mock_client.get.return_value = mock_response(sample)
        result = football_api.get_fixture_events(9999)
    assert result == []
