from fastapi import APIRouter, HTTPException, Query
from services.football_api import get_team, get_team_next_fixture, get_team_last_fixtures, get_team_season_fixtures

router = APIRouter()


@router.get("/teams/{team_id}/next")
def team_next(team_id: int):
    """Return the next scheduled fixture for a team."""
    try:
        result = get_team_next_fixture(team_id)
        return result if result is not None else {}
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.get("/teams/{team_id}/last-fixtures")
def team_last(team_id: int, last: int = Query(default=5, ge=1, le=10)):
    """Return last N fixtures for a team."""
    try:
        return get_team_last_fixtures(team_id, last)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.get("/teams/{team_id}/season-fixtures")
def team_season_fixtures(team_id: int):
    """Return all season fixtures (past + upcoming) for a team, sorted by date."""
    try:
        return get_team_season_fixtures(team_id)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.get("/teams/{league}/{team_id}")
def team(league: str, team_id: int):
    """Get team details by team_id. League parameter kept for API compatibility."""
    try:
        return get_team(team_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))
