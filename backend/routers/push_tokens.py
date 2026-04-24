from fastapi import APIRouter, Depends
from pydantic import BaseModel
from middleware.auth import get_current_user
from services.supabase_client import get_supabase

router = APIRouter(tags=["push_tokens"])

class PushTokenPayload(BaseModel):
    token: str
    platform: str

@router.post("/api/push-token")
def register_push_token(
    payload: PushTokenPayload,
    user_id: str = Depends(get_current_user),
):
    supabase = get_supabase()
    supabase.table("push_tokens").upsert(
        {
            "user_id": user_id,
            "token": payload.token,
            "platform": payload.platform,
        },
        on_conflict="user_id,token",
    ).execute()
    return {"status": "ok"}

@router.delete("/api/push-token")
def delete_push_token(
    payload: PushTokenPayload,
    user_id: str = Depends(get_current_user),
):
    supabase = get_supabase()
    supabase.table("push_tokens").delete().eq("user_id", user_id).eq("token", payload.token).execute()
    return {"status": "ok"}
