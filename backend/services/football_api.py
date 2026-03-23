import os
import httpx
from dotenv import load_dotenv
from .cache import TTLCache

load_dotenv()

BASE_URL = "https://api.football-data.org/v4"
API_KEY = os.getenv("FOOTBALL_API_KEY")

# Shared cache: standings TTL 5 min, matches 2 min, teams 10 min
_cache = TTLCache()

HEADERS = {
    "X-Auth-Token": API_KEY,
}


def _get(path: str, ttl: int = 300) -> dict:
    """Internal GET helper with caching."""
    cached = _cache.get(path)
    if cached is not None:
        return cached

    with httpx.Client(headers=HEADERS, timeout=10) as client:
        response = client.get(f"{BASE_URL}{path}")
        response.raise_for_status()
        data = response.json()

    _cache.set(path, data, ttl=ttl)
    return data


def get_standings(league_code: str) -> dict:
    return _get(f"/competitions/{league_code}/standings", ttl=300)


def get_matches(league_code: str, matchday: int | None = None, status: str | None = None) -> dict:
    params = ""
    parts = []
    if matchday:
        parts.append(f"matchday={matchday}")
    if status:
        parts.append(f"status={status}")
    if parts:
        params = "?" + "&".join(parts)
    return _get(f"/competitions/{league_code}/matches{params}", ttl=120)


def get_team(team_id: int) -> dict:
    return _get(f"/teams/{team_id}", ttl=600)
