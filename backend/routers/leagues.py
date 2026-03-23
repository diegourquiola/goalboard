from fastapi import APIRouter

router = APIRouter()

LEAGUES = [
    {"code": "PL",  "name": "Premier League"},
    {"code": "BL1", "name": "Bundesliga"},
    {"code": "SA",  "name": "Serie A"},
    {"code": "PD",  "name": "La Liga"},
    {"code": "FL1", "name": "Ligue 1"},
    {"code": "CL",  "name": "UEFA Champions League"},
]


@router.get("/leagues")
def list_leagues():
    return {"leagues": LEAGUES}
