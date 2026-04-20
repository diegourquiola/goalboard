from fastapi import APIRouter, HTTPException
from services.football_api import get_h2h, get_fixture_lineups

router = APIRouter()


@router.get("/h2h/{team1_id}/{team2_id}")
def head_to_head(team1_id: int, team2_id: int):
    """Return last 5 head-to-head fixtures between two teams."""
    try:
        return get_h2h(team1_id, team2_id)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.get("/fixtures/{fixture_id}/lineups")
def fixture_lineups(fixture_id: int):
    """Return starting XIs for a fixture."""
    try:
        return get_fixture_lineups(fixture_id)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))
