import datetime
from fastapi import APIRouter, HTTPException, Query
from services.football_api import _get, _parse_fixture


def _flag_emoji(flag_url: str) -> str:
    """Convert API-Football flag URL (e.g. .../flags/fr.svg) to flag emoji."""
    if not flag_url:
        return ""
    code = flag_url.rstrip('/').split('/')[-1].replace('.svg', '').replace('.png', '')
    if len(code) == 2 and code.isalpha():
        c = code.upper()
        return chr(0x1F1E0 + ord(c[0]) - 65) + chr(0x1F1E0 + ord(c[1]) - 65)
    return ""

router = APIRouter()

HOME_FEATURED_IDS = {2, 3, 39, 61, 78, 135, 140, 253, 848}
_FEATURED_ORDER   = [39, 140, 78, 135, 61, 2, 253, 3, 848]


@router.get("/home/matches")
def home_matches(date: str = Query(default=None), timezone: str = Query(default=None)):
    if not date:
        date = datetime.date.today().isoformat()

    today = datetime.date.today().isoformat()
    ttl   = 30 if date == today else 300

    params = {"date": date}
    if timezone:
        params["timezone"] = timezone

    try:
        raw = _get("/fixtures", params, ttl=ttl)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))

    fixtures = raw.get("response", [])

    featured_map: dict[int, dict] = {}
    country_map: dict[str, dict]  = {}

    for f in fixtures:
        parsed      = _parse_fixture(f)
        league_info = f.get("league", {})
        league_id   = league_info.get("id")
        league_name = league_info.get("name", "")
        league_logo = league_info.get("logo", "")
        country     = league_info.get("country", "")
        flag        = _flag_emoji(league_info.get("flag") or "")

        if league_id in HOME_FEATURED_IDS:
            if league_id not in featured_map:
                featured_map[league_id] = {
                    "league_id":   league_id,
                    "league_name": league_name,
                    "league_logo": league_logo,
                    "country":     country,
                    "matches":     [],
                }
            featured_map[league_id]["matches"].append(parsed)
        else:
            if country not in country_map:
                country_map[country] = {
                    "country":      country,
                    "country_flag": flag,
                    "leagues":      {},
                }
            if league_id not in country_map[country]["leagues"]:
                country_map[country]["leagues"][league_id] = {
                    "league_id":   league_id,
                    "league_name": league_name,
                    "league_logo": league_logo,
                    "matches":     [],
                }
            country_map[country]["leagues"][league_id]["matches"].append(parsed)

    featured = [featured_map[lid] for lid in _FEATURED_ORDER if lid in featured_map]

    countries = []
    for country_data in sorted(country_map.values(), key=lambda c: c["country"]):
        leagues = sorted(
            country_data["leagues"].values(),
            key=lambda l: (0 if l["league_id"] in HOME_FEATURED_IDS else 1, l["league_name"]),
        )
        countries.append({
            "country":      country_data["country"],
            "country_flag": country_data["country_flag"],
            "leagues":      leagues,
        })

    return {"featured": featured, "countries": countries}
