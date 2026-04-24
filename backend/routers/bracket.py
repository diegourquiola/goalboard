from fastapi import APIRouter, HTTPException
from services.football_api import get_cl_bracket

router = APIRouter()


@router.get("/cl-bracket")
def cl_bracket():
    try:
        return get_cl_bracket()
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))
