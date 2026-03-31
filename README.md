# GoalBoard

A React Native football stats app powered by [Soccerdata API](https://soccerdataapi.com).

## Backend setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env      # add your SOCCER_API_KEY
uvicorn main:app --reload --port 8000
```

### Key endpoints

| Endpoint | Description |
|---|---|
| `GET /api/standings/{league}` | Table standings (e.g. `PL`, `PD`, `BL1`) |
| `GET /api/matches/{league}` | Fixtures — optional `?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD&status=finished` |
| `GET /api/teams/{league}/{id}` | Team detail |
| `GET /api/leagues` | List of supported leagues |
| `GET /api/health` | Health check |

**Supported League Codes:**
- `PL` - Premier League (ID: 228)
- `PD` - La Liga (ID: 237)
- `BL1` - Bundesliga (ID: 235)
- `SA` - Serie A (ID: 236)
- `FL1` - Ligue 1 (ID: 233)
- `CL` - Champions League (ID: 239)

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

## API Documentation

The backend proxies requests to the [Soccerdata API](https://soccerdataapi.com/docs/).

**Important:** All API requests require:
- `auth_token` as a query parameter
- `Accept-Encoding: gzip` header
