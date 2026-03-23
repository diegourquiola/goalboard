from fastapi import APIRouter, HTTPException, Query
from services.football_api import get_matches

router = APIRouter()


@router.get("/matches/{league}")
def matches(
    league: str,
    matchday: int | None = Query(default=None),
    status: str | None = Query(default=None),
):
    league = league.upper()
    try:
        return get_matches(league, matchday=matchday, status=status)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))
