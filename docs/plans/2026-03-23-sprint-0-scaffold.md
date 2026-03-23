# Sprint 0 — Full Project Scaffold Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete the GoalBoard Sprint 0 scaffold: fix backend gaps, install dependencies, create the Expo frontend shell, and commit the initial repo.

**Architecture:** Three-tier — React Native (Expo) → FastAPI (Python) → Football-Data.org REST API. Backend proxies all external calls, owns the API key, and caches responses to stay within free-tier rate limits (10 req/min).

**Tech Stack:** Python 3.11+, FastAPI, httpx, Pydantic v2, pytest · React Native, Expo (managed), Axios, React Navigation v6, react-native-chart-kit

---

## Context: What's Already There

The backend skeleton was partially scaffolded. These files exist and are correct:
- `backend/services/cache.py` — TTLCache (set/get/invalidate/clear)
- `backend/services/football_api.py` — httpx client with caching
- `backend/routers/standings.py`, `matches.py`, `teams.py`
- `backend/tests/test_cache.py`, `test_football_api.py`, `test_validation.py`

**Gaps that must be fixed before Sprint 0 is complete:**

| Gap | File | Fix |
|-----|------|-----|
| Health route is `/health`, spec requires `/api/health` | `backend/main.py` | Add `/api/health` route |
| No `/api/leagues` endpoint | new `backend/routers/leagues.py` | Create leagues router |
| `MatchQuery` missing `date_from`/`date_to` fields and mutual-exclusivity validation | `backend/models/schemas.py` | Extend schema |
| `TTLCache` missing `stats()` method | `backend/services/cache.py` | Add stats() |
| No venv / deps installed | `backend/` | Create venv, pip install |
| Frontend entirely absent | `goalboard/frontend/` | Expo init + scaffold |
| No git repo | `goalboard/` | git init + initial commit |

---

## Task 1: Fix `/api/health` and add `/api/leagues` router

**Files:**
- Modify: `backend/main.py`
- Create: `backend/routers/leagues.py`

**Step 1: Add the leagues router file**

```python
# backend/routers/leagues.py
from fastapi import APIRouter

router = APIRouter()

LEAGUES = [
    {"code": "PL",  "name": "Premier League"},
    {"code": "BL1", "name": "Bundesliga"},
    {"code": "SA",  "name": "Serie A"},
    {"code": "PD",  "name": "La Liga"},
    {"code": "FL1", "name": "Ligue 1"},
    {"code": "CL",  "name": "UEFA Champions League"},
]


@router.get("/leagues")
def list_leagues():
    return {"leagues": LEAGUES}
```

**Step 2: Update `main.py`** — import leagues router, fix health route prefix

Replace the current `main.py` with:

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import standings, matches, teams, leagues

app = FastAPI(title="GoalBoard API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # tighten for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(standings.router, prefix="/api")
app.include_router(matches.router,   prefix="/api")
app.include_router(teams.router,     prefix="/api")
app.include_router(leagues.router,   prefix="/api")


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "goalboard-api"}
```

**Step 3: Update `routers/__init__.py`** — ensure leagues is importable (file is already empty, nothing to do unless it has explicit exports)

---

## Task 2: Extend `MatchQuery` with date range validation

**Files:**
- Modify: `backend/models/schemas.py`
- Modify: `backend/tests/test_validation.py`

**Step 1: Write the new failing tests first**

Add to `backend/tests/test_validation.py`:

```python
from datetime import date, timedelta


def test_matchday_and_date_from_mutually_exclusive():
    with pytest.raises(ValidationError):
        MatchQuery(league="PL", matchday=3, date_from="2024-09-01")


def test_date_to_before_date_from_rejected():
    with pytest.raises(ValidationError):
        MatchQuery(league="PL", date_from="2024-09-10", date_to="2024-09-01")


def test_date_to_equals_date_from_is_valid():
    mq = MatchQuery(league="PL", date_from="2024-09-01", date_to="2024-09-01")
    assert mq.date_from == "2024-09-01"


def test_empty_query_is_valid():
    mq = MatchQuery(league="PL")
    assert mq.matchday is None
    assert mq.date_from is None
```

**Step 2: Run tests to confirm they fail**

```bash
cd backend && python -m pytest tests/test_validation.py -v
```
Expected: FAIL — `MatchQuery` doesn't have `date_from`/`date_to` fields yet.

**Step 3: Update `schemas.py`**

```python
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
```

**Step 4: Run tests to confirm they pass**

```bash
cd backend && python -m pytest tests/test_validation.py -v
```
Expected: all PASS

---

## Task 3: Add `stats()` to TTLCache

**Files:**
- Modify: `backend/services/cache.py`
- Modify: `backend/tests/test_cache.py`

**Step 1: Write the failing test**

Add to `backend/tests/test_cache.py`:

```python
def test_stats():
    cache = TTLCache()
    cache.set("x", 1, ttl=60)
    cache.set("y", 2, ttl=60)
    stats = cache.stats()
    assert stats["entries"] == 2
```

**Step 2: Run to confirm it fails**

```bash
cd backend && python -m pytest tests/test_cache.py::test_stats -v
```
Expected: FAIL — `TTLCache` has no `stats` method.

**Step 3: Add `stats()` to `cache.py`**

Add inside the `TTLCache` class, after `clear()`:

```python
def stats(self) -> dict:
    """Return a snapshot of cache size (does not evict expired entries)."""
    with self._lock:
        return {"entries": len(self._store)}
```

**Step 4: Run all cache tests**

```bash
cd backend && python -m pytest tests/test_cache.py -v
```
Expected: all PASS

---

## Task 4: Set up Python virtual environment and install dependencies

**Files:** (no source changes, just environment)

**Step 1: Create venv and install**

```bash
cd /Users/diegourquiola08/IndividualSoftwareProject/goalboard/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

**Step 2: Run all backend tests**

```bash
cd backend && python -m pytest tests/ -v
```
Expected: All tests PASS (12+ tests across 3 test files).

> **Note:** Tests import `services.*` and `models.*` using paths relative to `backend/`. Run pytest from inside `backend/` or set `PYTHONPATH=backend`.

**Step 3: Start the server and verify health**

```bash
uvicorn main:app --reload --port 8000
```

In another terminal:
```bash
curl http://localhost:8000/api/health
```
Expected: `{"status":"ok","service":"goalboard-api"}`

---

## Task 5: Create the Expo frontend project

**Files:**
- Create: `frontend/` (via `create-expo-app`)

**Step 1: Initialize Expo project**

```bash
cd /Users/diegourquiola08/IndividualSoftwareProject/goalboard
npx create-expo-app@latest frontend --template blank
```

When prompted about which version to use, accept defaults.

**Step 2: Install navigation and chart dependencies**

```bash
cd frontend
npm install axios \
  react-native-chart-kit \
  react-native-svg \
  @react-navigation/native \
  @react-navigation/bottom-tabs \
  react-native-screens \
  react-native-safe-area-context \
  @expo/vector-icons
```

**Step 3: Verify Expo can start (smoke test)**

```bash
npx expo start --no-dev
```
Expected: Metro bundler starts, QR code displayed, no import errors.

Press `Ctrl+C` to stop.

---

## Task 6: Scaffold frontend directory structure and `App.js`

**Files:**
- Create: `frontend/src/screens/StandingsScreen.js`
- Create: `frontend/src/screens/MatchesScreen.js`
- Create: `frontend/src/screens/TrendsScreen.js`
- Create: `frontend/src/screens/TeamDetailScreen.js`
- Create: `frontend/src/components/LoadingState.js`
- Create: `frontend/src/components/ErrorState.js`
- Create: `frontend/src/services/api.js`
- Create: `frontend/src/utils/validation.js`
- Modify: `frontend/App.js`

**Step 1: Create placeholder screens**

Each screen follows this pattern (example for Standings):

```javascript
// frontend/src/screens/StandingsScreen.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function StandingsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Standings</Text>
      <Text style={styles.subtitle}>Coming in Sprint 1</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  title:     { fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  subtitle:  { fontSize: 14, color: '#888' },
});
```

Create `MatchesScreen.js`, `TrendsScreen.js`, `TeamDetailScreen.js` with the same shape — only change the `title` string.

**Step 2: Create reusable components**

```javascript
// frontend/src/components/LoadingState.js
import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';

export default function LoadingState({ message = 'Loading...' }) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#2563EB" />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  text:      { marginTop: 12, color: '#555', fontSize: 14 },
});
```

```javascript
// frontend/src/components/ErrorState.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function ErrorState({ message = 'Something went wrong.', onRetry }) {
  return (
    <View style={styles.container}>
      <Text style={styles.message}>{message}</Text>
      {onRetry && (
        <TouchableOpacity style={styles.button} onPress={onRetry}>
          <Text style={styles.buttonText}>Retry</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  message:    { fontSize: 16, color: '#DC2626', textAlign: 'center', marginBottom: 16 },
  button:     { backgroundColor: '#2563EB', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  buttonText: { color: '#fff', fontWeight: '600' },
});
```

**Step 3: Create API service**

```javascript
// frontend/src/services/api.js
import axios from 'axios';

/**
 * Axios instance pre-configured for the GoalBoard backend.
 * All screens import this instead of using axios directly,
 * so the base URL only needs to change in one place.
 */
const api = axios.create({
  baseURL: 'http://localhost:8000',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

export default api;
```

**Step 4: Create validation utility**

```javascript
// frontend/src/utils/validation.js

/**
 * Returns true if the string is a valid YYYY-MM-DD date.
 */
export function isValidDate(dateStr) {
  if (!dateStr) return false;
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) return false;
  const d = new Date(dateStr);
  return d instanceof Date && !isNaN(d);
}

/**
 * Returns true if date_from <= date_to (both YYYY-MM-DD strings).
 */
export function isDateRangeValid(dateFrom, dateTo) {
  if (!isValidDate(dateFrom) || !isValidDate(dateTo)) return false;
  return dateFrom <= dateTo;
}

/**
 * Returns true if matchday is an integer between 1 and 38 inclusive.
 */
export function isValidMatchday(matchday) {
  const n = Number(matchday);
  return Number.isInteger(n) && n >= 1 && n <= 38;
}
```

**Step 5: Replace `frontend/App.js` with bottom-tab navigator**

```javascript
// frontend/App.js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import StandingsScreen from './src/screens/StandingsScreen';
import MatchesScreen   from './src/screens/MatchesScreen';
import TrendsScreen    from './src/screens/TrendsScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            const icons = {
              Standings: focused ? 'list'         : 'list-outline',
              Matches:   focused ? 'football'     : 'football-outline',
              Trends:    focused ? 'bar-chart'    : 'bar-chart-outline',
            };
            return <Ionicons name={icons[route.name]} size={size} color={color} />;
          },
          tabBarActiveTintColor:   '#2563EB',
          tabBarInactiveTintColor: '#9CA3AF',
          headerShown: true,
        })}
      >
        <Tab.Screen name="Standings" component={StandingsScreen} />
        <Tab.Screen name="Matches"   component={MatchesScreen} />
        <Tab.Screen name="Trends"    component={TrendsScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
```

---

## Task 7: Initialize git repo and make first commit

**Step 1: Check/create `.gitignore`** (already exists at `goalboard/.gitignore` — verify it covers `venv/`, `node_modules/`, `.env`)

Open `goalboard/.gitignore` and confirm these lines exist:
```
# Python
venv/
__pycache__/
*.pyc
.env

# Node
node_modules/
.expo/

# OS
.DS_Store
```

**Step 2: Initialize git**

```bash
cd /Users/diegourquiola08/IndividualSoftwareProject/goalboard
git init
```

**Step 3: Stage all files**

```bash
git add .
git status   # verify .env and venv/ are NOT listed
```

> **Critical:** Confirm `backend/.env` (contains real API key) does NOT appear in staged files. If it does, the `.gitignore` is missing the `.env` rule — fix it before committing.

**Step 4: Initial commit**

```bash
git commit -m "Sprint 0: Project scaffold — FastAPI backend with tests + Expo frontend shell"
```

---

## Task 8: Final verification checklist

Run each command and confirm expected output:

```bash
# 1. All backend tests pass
cd /Users/diegourquiola08/IndividualSoftwareProject/goalboard/backend
source venv/bin/activate
python -m pytest tests/ -v
# Expected: all green, 0 failures

# 2. Backend health check
uvicorn main:app --port 8000 &
sleep 2
curl http://localhost:8000/api/health
# Expected: {"status":"ok","service":"goalboard-api"}

curl http://localhost:8000/api/leagues
# Expected: {"leagues":[{"code":"PL","name":"Premier League"}, ...]}

kill %1   # stop background server

# 3. Frontend starts without errors
cd /Users/diegourquiola08/IndividualSoftwareProject/goalboard/frontend
npx expo start --no-dev
# Expected: Metro bundler starts, no red error overlay
# Press Ctrl+C to stop
```

Sprint 0 is complete when all three verifications pass.

---

## Notes for Execution

- Run `pytest` from inside `backend/` (not from `goalboard/`) so relative imports (`from services.cache import TTLCache`) resolve correctly.
- The Football-Data.org API key lives in `backend/.env`. Tests mock all HTTP calls — you don't need a real key for tests to pass.
- `frontend/` uses Expo managed workflow — no Xcode/Android Studio needed for the Metro bundler smoke test; use `npx expo start` which just starts the JS bundler.
