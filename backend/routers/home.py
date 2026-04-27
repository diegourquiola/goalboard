import datetime
from fastapi import APIRouter, HTTPException, Query
from services.football_api import _get, _parse_fixture


_COUNTRY_ISO: dict[str, str] = {
    "Afghanistan": "AF", "Albania": "AL", "Algeria": "DZ", "Andorra": "AD",
    "Angola": "AO", "Antigua And Barbuda": "AG", "Argentina": "AR", "Armenia": "AM",
    "Australia": "AU", "Austria": "AT", "Azerbaijan": "AZ", "Bahamas": "BS",
    "Bahrain": "BH", "Bangladesh": "BD", "Belarus": "BY", "Belgium": "BE",
    "Belize": "BZ", "Benin": "BJ", "Bhutan": "BT", "Bolivia": "BO",
    "Bosnia": "BA", "Botswana": "BW", "Brazil": "BR", "Brunei": "BN",
    "Bulgaria": "BG", "Burkina Faso": "BF", "Burundi": "BI", "Cambodia": "KH",
    "Cameroon": "CM", "Canada": "CA", "Cape Verde": "CV", "Chad": "TD",
    "Chile": "CL", "China": "CN", "Colombia": "CO", "Comoros": "KM",
    "Congo": "CG", "Costa Rica": "CR", "Croatia": "HR", "Cuba": "CU",
    "Cyprus": "CY", "Czech Republic": "CZ", "Czechia": "CZ",
    "Denmark": "DK", "Djibouti": "DJ", "Dominican Republic": "DO",
    "DR Congo": "CD", "Ecuador": "EC", "Egypt": "EG", "El Salvador": "SV",
    "England": "GB", "Estonia": "EE", "Ethiopia": "ET",
    "Faroe Islands": "FO", "Finland": "FI", "France": "FR",
    "Gabon": "GA", "Gambia": "GM", "Georgia": "GE", "Germany": "DE",
    "Ghana": "GH", "Gibraltar": "GI", "Greece": "GR", "Guatemala": "GT",
    "Guinea": "GN", "Guinea Bissau": "GW", "Haiti": "HT", "Honduras": "HN",
    "Hong Kong": "HK", "Hungary": "HU", "Iceland": "IS", "India": "IN",
    "Indonesia": "ID", "Iran": "IR", "Iraq": "IQ", "Ireland": "IE",
    "Israel": "IL", "Italy": "IT", "Ivory Coast": "CI", "Jamaica": "JM",
    "Japan": "JP", "Jordan": "JO", "Kazakhstan": "KZ", "Kenya": "KE",
    "Kosovo": "XK", "Kuwait": "KW", "Kyrgyzstan": "KG", "Laos": "LA",
    "Latvia": "LV", "Lebanon": "LB", "Lesotho": "LS", "Liberia": "LR",
    "Libya": "LY", "Liechtenstein": "LI", "Lithuania": "LT", "Luxembourg": "LU",
    "Macedonia": "MK", "Madagascar": "MG", "Malawi": "MW", "Malaysia": "MY",
    "Maldives": "MV", "Mali": "ML", "Malta": "MT", "Mauritania": "MR",
    "Mauritius": "MU", "Mexico": "MX", "Moldova": "MD", "Mongolia": "MN",
    "Montenegro": "ME", "Morocco": "MA", "Mozambique": "MZ", "Myanmar": "MM",
    "Namibia": "NA", "Nepal": "NP", "Netherlands": "NL", "New Zealand": "NZ",
    "Nicaragua": "NI", "Niger": "NE", "Nigeria": "NG", "Northern Ireland": "GB",
    "North Korea": "KP", "Norway": "NO", "Oman": "OM", "Pakistan": "PK",
    "Palestine": "PS", "Panama": "PA", "Paraguay": "PY", "Peru": "PE",
    "Philippines": "PH", "Poland": "PL", "Portugal": "PT", "Puerto Rico": "PR",
    "Qatar": "QA", "Romania": "RO", "Russia": "RU", "Rwanda": "RW",
    "Saudi Arabia": "SA", "Scotland": "GB", "Senegal": "SN", "Serbia": "RS",
    "Sierra Leone": "SL", "Singapore": "SG", "Slovakia": "SK", "Slovenia": "SI",
    "Somalia": "SO", "South Africa": "ZA", "South Korea": "KR", "South Sudan": "SS",
    "Spain": "ES", "Sri Lanka": "LK", "Sudan": "SD", "Sweden": "SE",
    "Switzerland": "CH", "Syria": "SY", "Taiwan": "TW", "Tajikistan": "TJ",
    "Tanzania": "TZ", "Thailand": "TH", "Togo": "TG", "Trinidad And Tobago": "TT",
    "Tunisia": "TN", "Turkey": "TR", "Turkmenistan": "TM", "Uganda": "UG",
    "Ukraine": "UA", "United Arab Emirates": "AE", "Uruguay": "UY",
    "USA": "US", "United States": "US", "Uzbekistan": "UZ", "Venezuela": "VE",
    "Vietnam": "VN", "Wales": "GB", "Yemen": "YE", "Zambia": "ZM", "Zimbabwe": "ZW",
}

def _flag_emoji(country_name: str) -> str:
    code = _COUNTRY_ISO.get(country_name, "")
    if not code or len(code) != 2:
        return ""
    return chr(0x1F1E0 + ord(code[0]) - 65) + chr(0x1F1E0 + ord(code[1]) - 65)

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
        flag        = _flag_emoji(country)

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
