from fastapi import APIRouter, HTTPException
from services.football_api import (
    get_h2h,
    get_fixture_lineups,
    get_fixture_statistics,
    get_fixture_events,
    get_fixture_players,
    get_predictions,
)

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


@router.get("/fixtures/{fixture_id}/statistics")
def fixture_statistics(fixture_id: int):
    """Return full match statistics for a fixture (both teams)."""
    try:
        return get_fixture_statistics(fixture_id)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.get("/fixtures/{fixture_id}/events")
def fixture_events(fixture_id: int):
    """Return match events (goals, cards, substitutions) sorted by minute."""
    try:
        return get_fixture_events(fixture_id)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.get("/fixtures/{fixture_id}/players")
def fixture_players(fixture_id: int):
    """Return player_id -> rating map for a finished/live fixture."""
    try:
        return get_fixture_players(fixture_id)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.get("/fixtures/{fixture_id}/predictions")
def fixture_predictions(fixture_id: int):
    try:
        return get_predictions(fixture_id)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))
