from fastapi import APIRouter, HTTPException
from services.football_api import get_top_scorers

router = APIRouter()


@router.get("/top-scorers/{league}")
def top_scorers(league: str):
    league = league.upper()
    try:
        return get_top_scorers(league)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Upstream API error: {e}")
