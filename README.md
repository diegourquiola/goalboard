# GoalBoard

A React Native (Expo) football stats and live-notification app powered by [API-Football](https://www.api-football.com) and [Supabase](https://supabase.com).

## Features

- Live standings, fixtures, and match details for top European leagues
- Team and player profiles with season stats, recent form, and head-to-head records
- Search teams and leagues by name
- Favorites — save teams, leagues, and players; tap to navigate directly to their detail screens
- Push notifications for favorited-team matches: kick-off, half-time, full-time, goals, red cards, penalties, extra time, lineups, 30-minute reminders, postponements, and cancellations
- Authentication: email/password, Google, and Apple sign-in via Supabase Auth
- Persistent sessions — stay logged in until you manually sign out
- Profile — edit display name; change password via OTP email verification
- Dark/light theme

---

## Running the app

You need two terminals — one for the backend, one for the frontend.

### 1. Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in SOCCER_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`.

The background scheduler starts automatically with the server and polls:
- Live fixtures every 60 seconds (goals, cards, status changes, lineups)
- Today's full fixture list every 60 seconds (pre-match lineups, 30-min reminders, postponements/cancellations)

### 2. Frontend

```bash
cd frontend
npm install
npx expo start
```

Press `i` to open in iOS Simulator, `a` for Android emulator, or scan the QR code with the Expo Go app.

Set the following in `frontend/.env`:

```
EXPO_PUBLIC_BACKEND_URL=http://<your-machine-ip>:8000
EXPO_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
EXPO_PUBLIC_GOOGLE_CLIENT_ID=<google-oauth-client-id>
```

> On a physical device, use your machine's local IP instead of `localhost`.

---

## API endpoints

### Leagues & Standings

| Endpoint | Description |
|---|---|
| `GET /api/leagues` | Featured leagues |
| `GET /api/leagues/search?q=NAME` | Search all leagues by name |
| `GET /api/standings/{league}` | Table standings — `league` is a code (`PL`) or numeric ID (`39`) |
| `GET /api/matches/{league}` | Fixtures — optional `?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD&status=finished` |

### Teams & Players

| Endpoint | Description |
|---|---|
| `GET /api/teams/{league}/{id}` | Team detail (squad, stats) |
| `GET /api/teams/search?q=NAME` | Search teams by name |
| `GET /api/teams/{team_id}/next` | Next scheduled fixture for a team |
| `GET /api/teams/{team_id}/last-fixtures` | Last N fixtures for a team |
| `GET /api/teams/{team_id}/season-fixtures` | All season fixtures (past + upcoming) |
| `GET /api/players/{player_id}/stats` | Player season stats |
| `GET /api/top-scorers/{league_id}` | Top scorers for a league |
| `GET /api/top-assists/{league_id}` | Top assists for a league |

### Fixtures

| Endpoint | Description |
|---|---|
| `GET /api/h2h/{team1_id}/{team2_id}` | Last 5 head-to-head fixtures |
| `GET /api/fixtures/{fixture_id}/lineups` | Starting XIs for a fixture |
| `GET /api/fixtures/{fixture_id}/events` | Match events (goals, cards, subs) |
| `GET /api/fixtures/{fixture_id}/stats` | Match statistics |

### Notifications & User Data

| Endpoint | Description |
|---|---|
| `POST /api/push-token` | Register/update Expo push token for the authenticated user |
| `POST /api/match-subscriptions` | Subscribe to push notifications for a specific fixture |
| `DELETE /api/match-subscriptions/{fixture_id}` | Unsubscribe from a fixture |

### Misc

| Endpoint | Description |
|---|---|
| `GET /api/health` | Health check |

**Supported league codes:** `PL` · `PD` · `BL1` · `SA` · `FL1` · `CL`

---

## Run tests

```bash
cd backend
source venv/bin/activate
pytest tests/ -v
```
