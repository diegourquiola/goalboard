# GoalBoard

A React Native football stats app powered by [football-data.org](https://football-data.org).

## Backend setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env      # add your FOOTBALL_API_KEY
uvicorn main:app --reload --port 8000
```

### Key endpoints

| Endpoint | Description |
|---|---|
| `GET /api/standings/{league}` | Table standings (e.g. `PL`, `PD`, `BL1`) |
| `GET /api/matches/{league}` | Fixtures — optional `?matchday=N&status=FINISHED` |
| `GET /api/teams/{league}/{id}` | Team detail |
| `GET /health` | Health check |

## Run tests

```bash
cd backend
pytest tests/ -v
```

## Frontend setup (Sprint 1)

```bash
npx create-expo-app frontend --template blank
cd frontend
npm install axios react-native-chart-kit react-native-svg \
  @react-navigation/native @react-navigation/bottom-tabs
```
