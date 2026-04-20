# GoalBoard

A React Native football stats app powered by [API-Football](https://www.api-football.com).

## Running the app

You need two terminals — one for the backend, one for the frontend.

### 1. Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env      # then add your SOCCER_API_KEY inside .env
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`.

### 2. Frontend

```bash
cd frontend
npm install
npx expo start
```

Press `i` to open in iOS Simulator, `a` for Android emulator, or scan the QR code with the Expo Go app.

> The frontend expects the backend at `http://localhost:8000`. If you're running on a physical device, update `src/services/api.js` to use your machine's local IP instead of `localhost`.

---

## API endpoints

| Endpoint | Description |
|---|---|
| `GET /api/standings/{league}` | Table standings — `league` is a code (`PL`) or numeric ID (`39`) |
| `GET /api/matches/{league}` | Fixtures — optional `?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD&status=finished` |
| `GET /api/leagues` | Featured leagues |
| `GET /api/leagues/search?q=NAME` | Search all leagues by name |
| `GET /api/h2h/{team1_id}/{team2_id}` | Last 5 head-to-head fixtures |
| `GET /api/fixtures/{fixture_id}/lineups` | Starting XIs for a fixture |
| `GET /api/teams/{team_id}/next` | Next scheduled fixture for a team |
| `GET /api/teams/{team_id}/last-fixtures` | Last N fixtures for a team |
| `GET /api/teams/{league}/{id}` | Team detail |
| `GET /api/health` | Health check |

**Supported league codes:** `PL` · `PD` · `BL1` · `SA` · `FL1` · `CL`

---

## Run tests

```bash
cd backend
source venv/bin/activate
pytest tests/ -v
```
