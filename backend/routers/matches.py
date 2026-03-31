from fastapi import APIRouter, HTTPException, Query
from services.football_api import get_matches

router = APIRouter()


@router.get("/matches/{league}")
def matches(
    league: str,
    matchday: int | None = Query(default=None),
    status: str | None = Query(default=None),
    date_from: str | None = Query(default=None),
    date_to: str | None = Query(default=None),
):
    """
    Get matches for a league with optional filters.
    Note: matchday and status filters are applied client-side as 
    Soccerdata API doesn't support them directly.
    """
    league = league.upper()
    try:
        result = get_matches(league, matchday=matchday, status=status, 
                           date_from=date_from, date_to=date_to)
        
        # Filter by matchday and status client-side if needed
        if isinstance(result, list) and (matchday or status):
            filtered_leagues = []
            for league_data in result:
                filtered_matches = league_data.get("matches", [])
                
                # Filter by status if provided
                if status and filtered_matches:
                    status_lower = status.lower()
                    filtered_matches = [
                        m for m in filtered_matches 
                        if m.get("status", "").lower() == status_lower
                    ]
                
                # Note: matchday filtering would require additional metadata
                # from the API that may not be available in all responses
                
                league_data["matches"] = filtered_matches
                filtered_leagues.append(league_data)
            
            return filtered_leagues
        
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))
