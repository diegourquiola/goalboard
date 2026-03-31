from fastapi import APIRouter, HTTPException
from services.football_api import get_team

router = APIRouter()


@router.get("/teams/{league}/{team_id}")
def team(league: str, team_id: int):
    """Get team details by team_id. League parameter kept for API compatibility."""
    try:
        return get_team(team_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))
