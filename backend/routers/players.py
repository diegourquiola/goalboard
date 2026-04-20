from fastapi import APIRouter, HTTPException
from services.football_api import get_player

router = APIRouter()


@router.get("/players/{player_id}")
def player_detail(player_id: int):
    try:
        return get_player(player_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Upstream API error: {e}")
