import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

from routers import standings, matches, teams, leagues, fixtures, top_scorers, squad, players, push_tokens, bracket, home
from services.scheduler import get_scheduler
from services.notification_service import poll_live_events, poll_upcoming_events


@asynccontextmanager
async def lifespan(app):
    scheduler = get_scheduler()
    scheduler.add_job(poll_live_events,     "interval", seconds=60, id="live_events")
    scheduler.add_job(poll_upcoming_events, "interval", seconds=60, id="upcoming_events")
    scheduler.start()
    yield
    scheduler.shutdown()


app = FastAPI(title="GoalBoard API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(standings.router,    prefix="/api")
app.include_router(matches.router,      prefix="/api")
app.include_router(teams.router,        prefix="/api")
app.include_router(leagues.router,      prefix="/api")
app.include_router(fixtures.router,     prefix="/api")
app.include_router(top_scorers.router,  prefix="/api")
app.include_router(squad.router,        prefix="/api")
app.include_router(players.router,      prefix="/api")
app.include_router(push_tokens.router)
app.include_router(bracket.router,      prefix="/api")
app.include_router(home.router,         prefix="/api")


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "goalboard-api"}
