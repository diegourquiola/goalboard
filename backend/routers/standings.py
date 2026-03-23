from fastapi import APIRouter, HTTPException
from services.football_api import get_standings

router = APIRouter()


@router.get("/standings/{league}")
def standings(league: str):
    league = league.upper()
    try:
        return get_standings(league)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))
