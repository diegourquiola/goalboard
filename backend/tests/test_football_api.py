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
        "id": 228,
        "league": {"id": 228, "name": "Premier League"},
        "stage": []
    }
    with patch("services.football_api.httpx.Client") as mock_client_cls:
        mock_client = mock_client_cls.return_value.__enter__.return_value
        mock_client.get.return_value = mock_response(sample)
        result = football_api.get_standings("PL")

    # Check that the correct URL and params were used
    call_args = mock_client.get.call_args
    assert "https://api.soccerdataapi.com/standing/" in call_args[0][0]
    assert call_args[1]["params"]["league_id"] == 228
    assert "auth_token" in call_args[1]["params"]
    assert result == sample


def test_get_standings_uses_cache():
    sample = {
        "id": 228,
        "league": {"id": 228, "name": "Premier League"},
        "stage": []
    }
    with patch("services.football_api.httpx.Client") as mock_client_cls:
        mock_client = mock_client_cls.return_value.__enter__.return_value
        mock_client.get.return_value = mock_response(sample)

        football_api.get_standings("PL")
        football_api.get_standings("PL")   # second call — should hit cache

    assert mock_client.get.call_count == 1  # only one real HTTP call


def test_get_matches_with_date_filters():
    sample = [{
        "league_id": 228,
        "league_name": "Premier League",
        "matches": []
    }]
    with patch("services.football_api.httpx.Client") as mock_client_cls:
        mock_client = mock_client_cls.return_value.__enter__.return_value
        mock_client.get.return_value = mock_response(sample)
        football_api.get_matches("PL", date_from="2024-09-01", date_to="2024-09-30")

    call_args = mock_client.get.call_args
    params = call_args[1]["params"]
    assert params["league_id"] == 228
    assert params["date_from"] == "2024-09-01"
    assert params["date_to"] == "2024-09-30"


def test_request_uses_gzip_header():
    """Ensure Accept-Encoding: gzip header is passed to the HTTP client."""
    sample = {
        "id": 228,
        "league": {"id": 228, "name": "Premier League"},
        "stage": []
    }
    with patch("services.football_api.httpx.Client") as mock_client_cls:
        mock_client = mock_client_cls.return_value.__enter__.return_value
        mock_client.get.return_value = mock_response(sample)
        football_api.get_standings("PL")

    # httpx.Client is instantiated with headers
    _, kwargs = mock_client_cls.call_args
    assert "Accept-Encoding" in kwargs.get("headers", {})
    assert kwargs["headers"]["Accept-Encoding"] == "gzip"


def test_invalid_league_code_raises_error():
    """Test that invalid league codes raise ValueError."""
    with pytest.raises(ValueError, match="Unsupported league code"):
        football_api.get_standings("XYZ")
