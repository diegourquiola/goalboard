from fastapi import APIRouter, HTTPException
from services.football_api import get_standings

router = APIRouter()


@router.get("/standings/{league}")
def standings(league: str):
    """Get standings for a league using league code (e.g., 'PL', 'PD')."""
    league = league.upper()
    try:
        return get_standings(league)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))
