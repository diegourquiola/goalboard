import os
import httpx
from dotenv import load_dotenv
from .cache import TTLCache

load_dotenv()

BASE_URL = "https://v3.football.api-sports.io"
API_KEY = os.getenv("SOCCER_API_KEY")

_cache = TTLCache()

HEADERS = {
    "x-apisports-key": API_KEY,
}

# API-Football league IDs
LEAGUE_ID_MAP = {
    "PL": 39,     # Premier League
    "PD": 140,    # La Liga
    "BL1": 78,    # Bundesliga
    "SA": 135,    # Serie A
    "FL1": 61,    # Ligue 1
    "CL": 2,      # Champions League
}

CURRENT_SEASON = 2025  # 2025-26 season


def _get(path: str, params: dict | None = None, ttl: int = 300) -> dict:
    cache_key = path
    if params:
        param_str = "&".join(f"{k}={v}" for k, v in sorted(params.items()))
        cache_key = f"{path}?{param_str}"

    cached = _cache.get(cache_key)
    if cached is not None:
        return cached

    with httpx.Client(headers=HEADERS, timeout=10) as client:
        response = client.get(f"{BASE_URL}{path}", params=params)
        response.raise_for_status()
        data = response.json()

    _cache.set(cache_key, data, ttl=ttl)
    return data


def _get_league_id(league_code: str) -> int:
    try:
        return int(league_code)
    except (ValueError, TypeError):
        pass
    league_id = LEAGUE_ID_MAP.get(str(league_code).upper())
    if not league_id:
        raise ValueError(f"Unsupported league code: {league_code}")
    return league_id


def get_standings(league_code: str) -> dict:
    league_id = _get_league_id(league_code)
    raw = _get("/standings", params={"league": league_id, "season": CURRENT_SEASON}, ttl=300)

    # Transform to match frontend expectations
    response = raw.get("response", [])
    if not response:
        return {"stage": [{"standings": []}]}

    league_data = response[0].get("league", {})
    api_standings = league_data.get("standings", [[]])[0]

    standings = []
    for row in api_standings:
        team = row.get("team", {})
        all_stats = row.get("all", {})
        goals = all_stats.get("goals", {})
        gf = goals.get("for") or 0
        ga = goals.get("against") or 0
        standings.append({
            "position": row.get("rank"),
            "team_id": team.get("id"),
            "team_name": team.get("name"),
            "team_logo": team.get("logo"),
            "games_played": all_stats.get("played") or 0,
            # field names used by both StandingsScreen and TrendsScreen
            "wins": all_stats.get("win") or 0,
            "draws": all_stats.get("draw") or 0,
            "losses": all_stats.get("lose") or 0,
            "goals_for": gf,
            "goals_against": ga,
            "goal_difference": row.get("goalsDiff") or (gf - ga),
            "points": row.get("points") or 0,
            "form": row.get("form") or "",
        })

    return {
        "league": {"name": league_data.get("name", league_code)},
        "stage": [{"standings": standings}],
    }


LIVE_STATUSES = {"1H", "2H", "HT", "ET", "BT", "P", "LIVE"}


def _parse_fixture(f: dict) -> dict:
    fixture = f.get("fixture", {})
    teams = f.get("teams", {})
    goals = f.get("goals", {})
    status_info = fixture.get("status", {})
    statistics = f.get("statistics", [])

    status_short = status_info.get("short", "")
    is_live = status_short in LIVE_STATUSES
    is_finished = status_short in ("FT", "AET", "PEN")
    status_text = "finished" if is_finished else "live" if is_live else "pre-match"

    # Parse per-team statistics (pro plan returns these for live/finished matches)
    stats = {}
    for team_stat in statistics:
        side = "home" if team_stat.get("team", {}).get("id") == teams.get("home", {}).get("id") else "away"
        for s in team_stat.get("statistics", []):
            stype = s.get("type", "")
            val = s.get("value") or 0
            if stype == "Ball Possession":
                try:
                    val = int(str(val).replace("%", ""))
                except (ValueError, TypeError):
                    val = 0
                stats[f"possession_{side}"] = val
            elif stype == "Shots on Goal":
                stats[f"shots_{side}"] = val
            elif stype == "Corner Kicks":
                stats[f"corners_{side}"] = val
            elif stype == "Total passes":
                stats[f"passes_{side}"] = val
            elif stype == "Fouls":
                stats[f"fouls_{side}"] = val

    return {
        "id": fixture.get("id"),
        "date": fixture.get("date"),
        "status": status_text,
        "minute": status_info.get("elapsed"),
        "venue": {
            "name": fixture.get("venue", {}).get("name"),
            "city": fixture.get("venue", {}).get("city"),
        },
        "teams": {
            "home": {
                "id": teams.get("home", {}).get("id"),
                "name": teams.get("home", {}).get("name"),
                "logo": teams.get("home", {}).get("logo"),
            },
            "away": {
                "id": teams.get("away", {}).get("id"),
                "name": teams.get("away", {}).get("name"),
                "logo": teams.get("away", {}).get("logo"),
            },
        },
        "score": {
            "home": goals.get("home"),
            "away": goals.get("away"),
        },
        "stats": stats if stats else None,
    }


def get_matches(league_code: str, matchday: int | None = None, status: str | None = None,
                date_from: str | None = None, date_to: str | None = None) -> list:
    league_id = _get_league_id(league_code)
    params = {"league": league_id, "season": CURRENT_SEASON}

    if date_from:
        params["from"] = date_from
    if date_to:
        params["to"] = date_to
    if status:
        status_map = {"finished": "FT", "pre-match": "NS", "live": "1H-2H-HT-ET-BT-P"}
        params["status"] = status_map.get(status.lower(), status)

    # Full-season fetch: 5 min TTL. Date-filtered with today: 30s. Others: 2 min.
    if not date_from and not date_to:
        ttl = 300   # full season, refresh every 5 min
    elif date_from and date_from <= str(__import__('datetime').date.today()) <= (date_to or date_from):
        ttl = 30    # includes today → may have live matches
    else:
        ttl = 120
    raw = _get("/fixtures", params=params, ttl=ttl)
    fixtures = raw.get("response", [])

    matches = [_parse_fixture(f) for f in fixtures]
    return [{"league_id": league_id, "league_name": league_code, "matches": matches}]


def get_team(team_id: int) -> dict:
    raw = _get("/teams", params={"id": team_id}, ttl=600)
    response = raw.get("response", [])
    if not response:
        raise ValueError(f"Team not found: {team_id}")
    return response[0]


def get_leagues() -> dict:
    return _get("/leagues", params={"season": CURRENT_SEASON}, ttl=3600)


def search_leagues(q: str) -> list:
    raw = _get("/leagues", params={"search": q}, ttl=3600)
    results = []
    for item in raw.get("response", []):
        league  = item.get("league", {})
        country = item.get("country", {})
        results.append({
            "id":           league.get("id"),
            "name":         league.get("name"),
            "logo":         league.get("logo"),
            "country":      country.get("name"),
            "country_flag": country.get("flag"),
        })
    return results


def get_h2h(team1_id: int, team2_id: int) -> list:
    raw = _get(
        "/fixtures/headtohead",
        params={"h2h": f"{team1_id}-{team2_id}", "last": 5},
        ttl=300,
    )
    return [_parse_fixture(f) for f in raw.get("response", [])]


def get_team_last_fixtures(team_id: int, last: int = 5) -> list:
    raw = _get("/fixtures", params={"team": team_id, "last": last}, ttl=120)
    return [_parse_fixture(f) for f in raw.get("response", [])]


def get_fixture_lineups(fixture_id: int) -> list:
    raw = _get("/fixtures/lineups", params={"fixture": fixture_id}, ttl=600)
    result = []
    for team_data in raw.get("response", []):
        team = team_data.get("team", {})
        players = [
            p.get("player", {}).get("name")
            for p in team_data.get("startXI", [])
        ]
        result.append({
            "team_id":   team.get("id"),
            "team_name": team.get("name"),
            "team_logo": team.get("logo"),
            "formation": team_data.get("formation"),
            "players":   players,
        })
    return result


def get_top_scorers(league_code: str) -> list:
    league_id = _get_league_id(league_code)
    raw = _get(
        "/players/topscorers",
        params={"league": league_id, "season": CURRENT_SEASON},
        ttl=300,
    )
    result = []
    for item in raw.get("response", []):
        player = item.get("player", {})
        stats_list = item.get("statistics", [])
        stat = stats_list[0] if stats_list else {}
        team = stat.get("team", {})
        goals_info = stat.get("goals", {})
        result.append({
            "id": player.get("id"),
            "name": player.get("name"),
            "photo": player.get("photo"),
            "nationality": player.get("nationality"),
            "team_name": team.get("name"),
            "team_logo": team.get("logo"),
            "goals": goals_info.get("total") or 0,
            "assists": goals_info.get("assists") or 0,
            "appearances": stat.get("games", {}).get("appearences") or 0,
        })
    return result


def get_team_next_fixture(team_id: int) -> dict | None:
    raw = _get("/fixtures", params={"team": team_id, "next": 1}, ttl=300)
    fixtures = raw.get("response", [])
    if not fixtures:
        return None
    return _parse_fixture(fixtures[0])
