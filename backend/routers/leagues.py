from fastapi import APIRouter, HTTPException, Query
from services.football_api import LEAGUE_ID_MAP, search_leagues

router = APIRouter()


@router.get("/leagues")
def list_leagues():
    """Return supported featured leagues."""
    leagues = [
        {"code": "PL",  "id": 39,  "name": "Premier League"},
        {"code": "PD",  "id": 140, "name": "La Liga"},
        {"code": "BL1", "id": 78,  "name": "Bundesliga"},
        {"code": "SA",  "id": 135, "name": "Serie A"},
        {"code": "FL1", "id": 61,  "name": "Ligue 1"},
        {"code": "CL",  "id": 2,   "name": "Champions League"},
    ]
    return {"leagues": leagues}


@router.get("/leagues/search")
def search_leagues_endpoint(q: str = Query(..., min_length=2)):
    """Search all leagues by name."""
    try:
        return search_leagues(q)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))
