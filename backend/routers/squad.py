from fastapi import APIRouter, HTTPException
from services.football_api import get_squad

router = APIRouter()


@router.get("/squad/{team_id}")
def squad(team_id: int):
    try:
        return get_squad(team_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Upstream API error: {e}")
