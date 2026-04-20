from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import standings, matches, teams, leagues, fixtures, top_scorers, squad, players

app = FastAPI(title="GoalBoard API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(standings.router, prefix="/api")
app.include_router(matches.router,   prefix="/api")
app.include_router(teams.router,     prefix="/api")
app.include_router(leagues.router,   prefix="/api")
app.include_router(fixtures.router,  prefix="/api")
app.include_router(top_scorers.router, prefix="/api")
app.include_router(squad.router, prefix="/api")
app.include_router(players.router, prefix="/api")


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "goalboard-api"}
