from fastapi import APIRouter, HTTPException
from services.football_api import LEAGUE_ID_MAP

router = APIRouter()


@router.get("/leagues")
def list_leagues():
    """Return supported leagues with their codes and IDs."""
    # Map of supported leagues with their Soccerdata API IDs
    leagues = [
        {"code": "PL", "id": 228, "name": "Premier League"},
        {"code": "PD", "id": 237, "name": "La Liga"},
        {"code": "BL1", "id": 235, "name": "Bundesliga"},
        {"code": "SA", "id": 236, "name": "Serie A"},
        {"code": "FL1", "id": 233, "name": "Ligue 1"},
        {"code": "CL", "id": 239, "name": "Champions League"},
    ]
    return {"leagues": leagues}
