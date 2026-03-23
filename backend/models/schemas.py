from pydantic import BaseModel, field_validator, model_validator
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
    date_from: Optional[str] = None   # YYYY-MM-DD
    date_to: Optional[str] = None     # YYYY-MM-DD

    @field_validator("status")
    @classmethod
    def validate_status(cls, v):
        allowed = {
            "SCHEDULED", "LIVE", "IN_PLAY", "PAUSED", "FINISHED",
            "SUSPENDED", "POSTPONED", "CANCELLED", "AWARDED"
        }
        if v and v.upper() not in allowed:
            raise ValueError(f"Invalid status '{v}'")
        return v.upper() if v else v

    @model_validator(mode="after")
    def validate_date_and_matchday(self) -> "MatchQuery":
        has_matchday = self.matchday is not None
        has_dates = self.date_from is not None or self.date_to is not None

        if has_matchday and has_dates:
            raise ValueError("matchday and date_from/date_to are mutually exclusive")

        if self.date_from and self.date_to:
            if self.date_to < self.date_from:
                raise ValueError("date_to must be >= date_from")

        return self
