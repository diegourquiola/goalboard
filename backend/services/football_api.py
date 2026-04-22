import os
import datetime
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

def _current_season() -> int:
    today = datetime.date.today()
    return today.year if today.month >= 7 else today.year - 1

CURRENT_SEASON = _current_season()


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


def _parse_league_item(item: dict) -> dict:
    league  = item.get("league", {})
    country = item.get("country", {})
    return {
        "id":           league.get("id"),
        "name":         league.get("name"),
        "logo":         league.get("logo"),
        "country":      country.get("name"),
        "country_flag": country.get("flag"),
    }


def search_leagues(q: str) -> list:
    # Search by league name and by country in parallel, then merge & deduplicate
    by_name    = _get("/leagues", params={"search": q}, ttl=3600).get("response", [])
    by_country = _get("/leagues", params={"country": q}, ttl=3600).get("response", [])

    seen = set()
    results = []
    for item in by_name + by_country:
        league_id = item.get("league", {}).get("id")
        if league_id and league_id not in seen:
            seen.add(league_id)
            results.append(_parse_league_item(item))
    return results


def search_teams(q: str) -> list:
    raw = _get("/teams", params={"search": q}, ttl=300)
    results = []
    for item in raw.get("response", []):
        team    = item.get("team", {})
        venue   = item.get("venue", {})
        results.append({
            "id":      team.get("id"),
            "name":    team.get("name"),
            "logo":    team.get("logo"),
            "country": team.get("country"),
            "venue":   venue.get("name"),
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
        players = []
        for entry in team_data.get("startXI", []):
            p = entry.get("player", {})
            players.append({
                "id": p.get("id"),
                "name": p.get("name"),
                "number": p.get("number"),
                "pos": p.get("pos"),
                "grid": p.get("grid"),
                "photo": f"https://media.api-sports.io/football/players/{p.get('id')}.png" if p.get("id") else None,
            })
        subs = []
        for entry in team_data.get("substitutes", []):
            p = entry.get("player", {})
            subs.append({
                "id": p.get("id"),
                "name": p.get("name"),
                "number": p.get("number"),
                "pos": p.get("pos"),
                "grid": None,
                "photo": f"https://media.api-sports.io/football/players/{p.get('id')}.png" if p.get("id") else None,
            })
        result.append({
            "team_id":   team.get("id"),
            "team_name": team.get("name"),
            "team_logo": team.get("logo"),
            "formation": team_data.get("formation"),
            "players":   players,
            "substitutes": subs,
        })
    return result


def get_fixture_players(fixture_id: int) -> dict:
    """Return a map of player_id -> rating and list of captain IDs for a given fixture."""
    raw = _get("/fixtures/players", params={"fixture": fixture_id}, ttl=600)
    ratings = {}
    captains = []
    for team_data in raw.get("response", []):
        for entry in team_data.get("players", []):
            player = entry.get("player", {})
            pid = player.get("id")
            stats_list = entry.get("statistics", [])
            rating = None
            is_captain = False
            if stats_list:
                rating = stats_list[0].get("games", {}).get("rating")
                is_captain = stats_list[0].get("games", {}).get("captain", False)
            if pid and rating:
                try:
                    ratings[pid] = round(float(rating), 1)
                except (ValueError, TypeError):
                    pass
            if pid and is_captain:
                captains.append(pid)
    return {"ratings": ratings, "captains": captains}


STAT_KEYS = {
    "Shots on Goal",
    "Shots off Goal",
    "Total Shots",
    "Blocked Shots",
    "Shots insidebox",
    "Shots outsidebox",
    "Fouls",
    "Corner Kicks",
    "Offsides",
    "Ball Possession",
    "Yellow Cards",
    "Red Cards",
    "Goalkeeper Saves",
    "Passes accurate",
    "Passes %",
}


def _parse_stat_value(val) -> int:
    if val is None:
        return 0
    if isinstance(val, str):
        try:
            return int(val.replace("%", "").strip())
        except ValueError:
            return 0
    try:
        return int(val)
    except (TypeError, ValueError):
        return 0


def get_fixture_statistics(fixture_id: int) -> list:
    raw = _get("/fixtures/statistics", params={"fixture": fixture_id}, ttl=30)
    result = []
    for team_data in raw.get("response", []):
        team = team_data.get("team", {})
        stats = {}
        for s in team_data.get("statistics", []):
            stat_type = s.get("type", "")
            if stat_type in STAT_KEYS:
                stats[stat_type] = _parse_stat_value(s.get("value"))
        result.append({
            "team_id":   team.get("id"),
            "team_name": team.get("name"),
            "team_logo": team.get("logo"),
            "stats":     stats,
        })
    return result


def get_fixture_events(fixture_id: int) -> list:
    raw = _get("/fixtures/events", params={"fixture": fixture_id}, ttl=30)
    events = []
    for e in raw.get("response", []):
        time   = e.get("time", {})
        team   = e.get("team", {})
        player = e.get("player", {})
        assist = e.get("assist", {})
        events.append({
            "minute":       time.get("elapsed"),
            "extra_minute": time.get("extra"),
            "team_id":      team.get("id"),
            "team_name":    team.get("name"),
            "team_logo":    team.get("logo"),
            "player_id":    player.get("id"),
            "player_name":  player.get("name"),
            "assist_id":    assist.get("id"),
            "assist_name":  assist.get("name") or None,
            "type":         e.get("type"),
            "detail":       e.get("detail"),
        })
    return sorted(
        events,
        key=lambda ev: (ev.get("minute") or 0, ev.get("extra_minute") or 0),
    )


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


def get_squad(team_id: int) -> list:
    raw = _get("/players/squads", params={"team": team_id}, ttl=600)
    response = raw.get("response", [])
    if not response:
        return []
    players = response[0].get("players", [])
    return [
        {
            "id": p.get("id"),
            "name": p.get("name"),
            "age": p.get("age"),
            "number": p.get("number"),
            "position": p.get("position"),
            "photo": p.get("photo"),
        }
        for p in players
    ]


def get_player(player_id: int) -> dict:
    raw = _get("/players", params={"id": player_id, "season": CURRENT_SEASON}, ttl=600)
    response = raw.get("response", [])
    if not response:
        raise ValueError(f"Player not found: {player_id}")

    item = response[0]
    p = item.get("player", {})
    birth = p.get("birth", {})

    stats = []
    for s in item.get("statistics", []):
        team_info = s.get("team", {})
        league_info = s.get("league", {})
        games = s.get("games", {})
        shots = s.get("shots", {})
        goals = s.get("goals", {})
        passes = s.get("passes", {})
        tackles = s.get("tackles", {})
        duels = s.get("duels", {})
        dribbles = s.get("dribbles", {})
        fouls = s.get("fouls", {})
        cards = s.get("cards", {})
        penalty = s.get("penalty", {})

        stats.append({
            "team": {
                "id": team_info.get("id"),
                "name": team_info.get("name"),
                "logo": team_info.get("logo"),
            },
            "league": {
                "id": league_info.get("id"),
                "name": league_info.get("name"),
                "logo": league_info.get("logo"),
                "country": league_info.get("country"),
                "season": league_info.get("season"),
            },
            "games": {
                "appearances": games.get("appearences"),
                "lineups": games.get("lineups"),
                "minutes": games.get("minutes"),
                "position": games.get("position"),
                "rating": games.get("rating"),
                "captain": games.get("captain"),
            },
            "shots": {
                "total": shots.get("total"),
                "on": shots.get("on"),
            },
            "goals": {
                "total": goals.get("total"),
                "conceded": goals.get("conceded"),
                "assists": goals.get("assists"),
                "saves": goals.get("saves"),
            },
            "passes": {
                "total": passes.get("total"),
                "key": passes.get("key"),
                "accuracy": passes.get("accuracy"),
            },
            "tackles": {
                "total": tackles.get("total"),
                "blocks": tackles.get("blocks"),
                "interceptions": tackles.get("interceptions"),
            },
            "duels": {
                "total": duels.get("total"),
                "won": duels.get("won"),
            },
            "dribbles": {
                "attempts": dribbles.get("attempts"),
                "success": dribbles.get("success"),
            },
            "fouls": {
                "drawn": fouls.get("drawn"),
                "committed": fouls.get("committed"),
            },
            "cards": {
                "yellow": cards.get("yellow"),
                "red": cards.get("red"),
            },
            "penalty": {
                "won": penalty.get("won"),
                "committed": penalty.get("commited"),
                "scored": penalty.get("scored"),
                "missed": penalty.get("missed"),
            },
        })

    return {
        "id": p.get("id"),
        "name": p.get("name"),
        "firstname": p.get("firstname"),
        "lastname": p.get("lastname"),
        "age": p.get("age"),
        "birth": {
            "date": birth.get("date"),
            "place": birth.get("place"),
            "country": birth.get("country"),
        },
        "nationality": p.get("nationality"),
        "height": p.get("height"),
        "weight": p.get("weight"),
        "photo": p.get("photo"),
        "injured": p.get("injured", False),
        "statistics": stats,
    }


def get_team_season_fixtures(team_id: int) -> list:
    raw = _get("/fixtures", params={"team": team_id, "season": CURRENT_SEASON}, ttl=120)
    fixtures = [_parse_fixture(f) for f in raw.get("response", [])]
    return sorted(fixtures, key=lambda f: f.get("date") or "")


def get_team_next_fixture(team_id: int) -> dict | None:
    raw = _get("/fixtures", params={"team": team_id, "next": 1}, ttl=300)
    fixtures = raw.get("response", [])
    if not fixtures:
        return None
    return _parse_fixture(fixtures[0])


def get_top_assists(league_code: str) -> list:
    league_id = _get_league_id(league_code)
    raw = _get(
        "/players/topassists",
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
            "assists": goals_info.get("assists") or 0,
            "goals": goals_info.get("total") or 0,
            "appearances": stat.get("games", {}).get("appearences") or 0,
        })
    return result


def get_predictions(fixture_id: int) -> dict:
    raw = _get("/predictions", params={"fixture": fixture_id}, ttl=600)
    response = raw.get("response", [])
    if not response:
        return {}
    data = response[0]
    preds = data.get("predictions", {})
    winner = preds.get("winner", {})
    return {
        "winner": {
            "id": winner.get("id"),
            "name": winner.get("name"),
            "comment": winner.get("comment"),
        },
        "win_or_draw": preds.get("win_or_draw"),
        "percent": preds.get("percent", {}),
        "advice": preds.get("advice"),
        "goals": preds.get("goals", {}),
        "comparison": data.get("comparison", {}),
    }


def get_injuries(team_id: int) -> list:
    raw = _get(
        "/injuries",
        params={"team": team_id, "season": CURRENT_SEASON},
        ttl=600,
    )
    result = []
    for item in raw.get("response", []):
        player = item.get("player", {})
        injury_type = player.get("type")
        if not injury_type:
            continue
        result.append({
            "player_id": player.get("id"),
            "player_name": player.get("name"),
            "player_photo": player.get("photo"),
            "type": injury_type,
            "reason": player.get("reason"),
        })
    return result


def get_coaches(team_id: int) -> dict:
    raw = _get("/coachs", params={"team": team_id}, ttl=3600)
    response = raw.get("response", [])
    if not response:
        return {}
    coach = response[0]
    return {
        "id": coach.get("id"),
        "name": coach.get("name"),
        "firstname": coach.get("firstname"),
        "lastname": coach.get("lastname"),
        "photo": coach.get("photo"),
        "nationality": coach.get("nationality"),
        "age": coach.get("age"),
    }


def get_transfers(team_id: int) -> list:
    raw = _get("/transfers", params={"team": team_id}, ttl=3600)
    result = []
    for item in raw.get("response", []):
        player = item.get("player", {})
        for transfer in item.get("transfers", []):
            teams = transfer.get("teams", {})
            result.append({
                "player_id": player.get("id"),
                "player_name": player.get("name"),
                "transfer_date": transfer.get("date"),
                "type": transfer.get("type"),
                "team_in": {
                    "name": teams.get("in", {}).get("name"),
                    "logo": teams.get("in", {}).get("logo"),
                },
                "team_out": {
                    "name": teams.get("out", {}).get("name"),
                    "logo": teams.get("out", {}).get("logo"),
                },
            })
    result.sort(key=lambda t: t.get("transfer_date") or "", reverse=True)
    return result[:20]
