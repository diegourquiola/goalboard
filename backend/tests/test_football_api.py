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
    sample = {"standings": []}
    with patch("services.football_api.httpx.Client") as mock_client_cls:
        mock_client = mock_client_cls.return_value.__enter__.return_value
        mock_client.get.return_value = mock_response(sample)
        result = football_api.get_standings("PL")

    mock_client.get.assert_called_once_with(
        "https://api.football-data.org/v4/competitions/PL/standings"
    )
    assert result == sample


def test_get_standings_uses_cache():
    sample = {"standings": []}
    with patch("services.football_api.httpx.Client") as mock_client_cls:
        mock_client = mock_client_cls.return_value.__enter__.return_value
        mock_client.get.return_value = mock_response(sample)

        football_api.get_standings("PL")
        football_api.get_standings("PL")   # second call — should hit cache

    assert mock_client.get.call_count == 1  # only one real HTTP call


def test_get_matches_with_filters():
    sample = {"matches": []}
    with patch("services.football_api.httpx.Client") as mock_client_cls:
        mock_client = mock_client_cls.return_value.__enter__.return_value
        mock_client.get.return_value = mock_response(sample)
        football_api.get_matches("PL", matchday=3, status="FINISHED")

    called_url = mock_client.get.call_args[0][0]
    assert "matchday=3" in called_url
    assert "status=FINISHED" in called_url


def test_request_uses_auth_header():
    """Ensure X-Auth-Token header is passed to the HTTP client."""
    sample = {"standings": []}
    with patch("services.football_api.httpx.Client") as mock_client_cls:
        mock_client = mock_client_cls.return_value.__enter__.return_value
        mock_client.get.return_value = mock_response(sample)
        football_api.get_standings("PL")

    # httpx.Client is instantiated with headers=HEADERS
    _, kwargs = mock_client_cls.call_args
    assert "X-Auth-Token" in kwargs.get("headers", {})
