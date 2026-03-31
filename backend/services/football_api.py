import os
import httpx
from dotenv import load_dotenv
from .cache import TTLCache

load_dotenv()

BASE_URL = "https://api.soccerdataapi.com"
API_KEY = os.getenv("SOCCER_API_KEY")

# Shared cache: standings TTL 5 min, matches 2 min, teams 10 min
_cache = TTLCache()

HEADERS = {
    "Accept-Encoding": "gzip",
    "Content-Type": "application/json",
}

# Map league codes to Soccerdata API league IDs
# Based on common league mappings
LEAGUE_ID_MAP = {
    "PL": 228,    # Premier League
    "PD": 237,    # La Liga
    "BL1": 235,   # Bundesliga
    "SA": 236,    # Serie A
    "FL1": 233,   # Ligue 1
    "CL": 239,    # Champions League
}


def _get(path: str, params: dict | None = None, ttl: int = 300) -> dict:
    """Internal GET helper with caching and gzip support."""
    # Build cache key including params
    cache_key = path
    if params:
        param_str = "&".join(f"{k}={v}" for k, v in sorted(params.items()))
        cache_key = f"{path}?{param_str}"
    
    cached = _cache.get(cache_key)
    if cached is not None:
        return cached

    # Add auth_token to params
    if params is None:
        params = {}
    params["auth_token"] = API_KEY

    with httpx.Client(headers=HEADERS, timeout=10) as client:
        response = client.get(f"{BASE_URL}{path}", params=params)
        response.raise_for_status()
        data = response.json()

    _cache.set(cache_key, data, ttl=ttl)
    return data


def get_standings(league_code: str) -> dict:
    """Get standings by league code (converts to league_id internally)."""
    league_id = LEAGUE_ID_MAP.get(league_code.upper())
    if not league_id:
        raise ValueError(f"Unsupported league code: {league_code}")
    
    return _get("/standing/", params={"league_id": league_id}, ttl=300)


def get_matches(league_code: str, matchday: int | None = None, status: str | None = None, 
                date_from: str | None = None, date_to: str | None = None) -> dict:
    """Get matches by league code with optional filters."""
    league_id = LEAGUE_ID_MAP.get(league_code.upper())
    if not league_id:
        raise ValueError(f"Unsupported league code: {league_code}")
    
    params = {"league_id": league_id}
    
    # Note: Soccerdata API uses 'date_from' and 'date_to' for filtering
    if date_from:
        params["date_from"] = date_from
    if date_to:
        params["date_to"] = date_to
    
    # Note: Soccerdata API doesn't have direct 'matchday' or 'status' filters
    # These would need to be filtered client-side from the results
    
    return _get("/matches/", params=params, ttl=120)


def get_team(team_id: int) -> dict:
    """Get team details by team_id."""
    return _get("/team/", params={"team_id": team_id}, ttl=600)


def get_leagues() -> dict:
    """Get all available leagues."""
    return _get("/league/", ttl=3600)
