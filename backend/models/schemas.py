from pydantic import BaseModel, field_validator
from typing import Optional

SUPPORTED_LEAGUES = {"PL", "PD", "BL1", "SA", "FL1", "CL", "EC"}


class LeagueCode(BaseModel):
    code: str

    @field_validator("code")
    @classmethod
    def validate_code(cls, v: str) -> str:
        v = v.upper()
        if v not in SUPPORTED_LEAGUES:
            raise ValueError(f"League '{v}' not supported. Choose from: {SUPPORTED_LEAGUES}")
        return v


class MatchQuery(BaseModel):
    league: str
    matchday: Optional[int] = None
    status: Optional[str] = None

    @field_validator("status")
    @classmethod
    def validate_status(cls, v):
        allowed = {"SCHEDULED", "LIVE", "IN_PLAY", "PAUSED", "FINISHED", "SUSPENDED", "POSTPONED", "CANCELLED", "AWARDED"}
        if v and v.upper() not in allowed:
            raise ValueError(f"Invalid status '{v}'")
        return v.upper() if v else v
