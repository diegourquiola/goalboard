# GoalBoard Sprint 4 Design

**Date:** 2026-04-20  
**Status:** Approved

---

## Overview

Sprint 4 adds four features on top of the existing React Native (Expo) + FastAPI codebase:

1. League search with featured competitions home
2. Match detail screen (venue, standings snippet, H2H, recent form, lineups)
3. Root stack navigation enabling screen pushes from any tab
4. Teams tab (renamed from Trends) with next game card

---

## 1. Navigation Architecture

`App.js` wraps the existing `BottomTabNavigator` inside a root `NativeStackNavigator`. `MatchDetailScreen` is registered on the root stack, not inside any tab.

```
RootStack (NativeStackNavigator)
├── MainTabs (BottomTabNavigator)
│   ├── Leagues  (LeaguesTab — internal state-based sub-navigation unchanged)
│   └── Teams    (TeamsScreen — renamed from TrendsScreen)
└── MatchDetail  (MatchDetailScreen)
```

Any component can navigate to `MatchDetail` via `navigation.navigate('MatchDetail', { match })`. React Navigation resolves the screen by walking up the navigator tree. No prop drilling required — components use the `useNavigation()` hook.

Match cards in `AllMatchesView` get an `onPress` handler. `MatchesScreen` (standalone) is wired the same way.

---

## 2. League Search

### Frontend — `LeaguesListScreen.js`

Two sections:

- **Featured Competitions** — existing 6-league grid at the top, label changed from "SELECT COMPETITION" to "FEATURED COMPETITIONS"
- **Search bar** — `TextInput` below the grid. While empty, nothing extra is shown. Once the user types, results appear in a list below showing league logo, name, and country. Tapping a result calls `onSelect` with the league object (same as tapping a featured card), opening `LeagueDetailScreen`.

Debounce search input by ~400ms before firing the API call.

### Backend

New function in `football_api.py`:
```python
def search_leagues(q: str) -> list
```
Calls `GET /leagues?search=q` on API-Football, returns a list of `{ code, id, name, country, logo }`.

New route in `leagues.py`:
```
GET /api/leagues/search?q=NAME
```

---

## 3. Match Detail Screen

### Navigation entry points

- Match row in `AllMatchesView` (used inside `LeagueDetailScreen`)
- Match card in `MatchesScreen` (standalone Matches tab if re-added later)

Both call `navigation.navigate('MatchDetail', { match })` where `match` is the already-parsed fixture object.

### Backend changes

**`_parse_fixture` in `football_api.py`** — add venue fields:
```python
"venue": {
    "name": fixture.get("venue", {}).get("name"),
    "city": fixture.get("venue", {}).get("city"),
}
```

**New functions in `football_api.py`:**

```python
def get_h2h(team1_id: int, team2_id: int) -> list
# Calls /fixtures/headtohead?h2h=T1-T2&season=2025, returns last 5 parsed fixtures

def get_team_last_fixtures(team_id: int, last: int = 5) -> list
# Calls /fixtures?team=TEAMID&last=N, returns parsed fixtures

def get_fixture_lineups(fixture_id: int) -> dict
# Calls /fixtures/lineups?fixture=FIXTUREID, returns { home: [...], away: [...] }
```

**New routes:**

```
GET /api/h2h/{team1_id}/{team2_id}
GET /api/teams/{team_id}/last-fixtures?last=5
GET /api/fixtures/{fixture_id}/lineups
```

### `MatchDetailScreen.js` — sections (scrollable)

1. **Header card** — home logo + name, score or kickoff time, away logo + name. Below: venue name + city, full kickoff datetime formatted as "Sun 20 Apr · 17:30".
2. **League Table Snippet** — fetches standings for the league, renders a condensed table. Both teams' rows are highlighted. Shows 3 rows above/below each team (or the full table if small).
3. **Head-to-Head** — last 5 meetings. Each row: date, home team, score, away team. Winner shown in bold.
4. **Recent Form** — two side-by-side columns (home team / away team), each showing last 5 results as W/D/L badges from `/api/teams/{id}/last-fixtures`.
5. **Lineups** — two columns (home XI / away XI). If the API returns empty or an error, show "Lineups not yet available" placeholder. Starting XI only (no bench).

All sections show individual loading states (skeleton or spinner) since they come from different endpoints fetched in parallel.

---

## 4. Teams Tab

### Tab rename

In `App.js`:
- Screen name: `Teams` (was `Trends`)
- Icon: `people` / `people-outline` (was `trending-up`)
- Header title stays as the GoalBoard logo + name

### `TeamsScreen.js` (was `TrendsScreen.js`)

New **Next Game** card inserted between the team selector card and the category chips. It:

- Fetches `GET /api/teams/{team_id}/next` when `selectedTeam` changes
- Shows: opponent logo + name, kickoff date + time, venue, home/away indicator
- Shows "No upcoming fixtures" if the season is over or no data returned
- Has its own small loading state (spinner inline, not full-screen)

New backend function in `football_api.py`:
```python
def get_team_next_fixture(team_id: int) -> dict | None
# Calls /fixtures?team=TEAMID&next=1, returns single parsed fixture or None
```

New route:
```
GET /api/teams/{team_id}/next
```

---

## Error handling

- All new backend endpoints raise `HTTPException(400)` for bad inputs, `HTTPException(502)` for upstream failures — consistent with existing routes.
- Frontend sections that fail to load show an inline "Failed to load" text with a retry option rather than crashing the whole screen.
- Lineups section degrades gracefully to a placeholder if the endpoint returns empty.

---

## Files changed

### Backend
| File | Change |
|------|--------|
| `services/football_api.py` | Add `search_leagues`, `get_h2h`, `get_team_last_fixtures`, `get_fixture_lineups`, `get_team_next_fixture`; update `_parse_fixture` to include venue |
| `routers/leagues.py` | Add `GET /api/leagues/search` |
| `routers/teams.py` | Add `GET /api/teams/{team_id}/next`, `GET /api/teams/{team_id}/last-fixtures` |
| `routers/matches.py` | Add `GET /api/fixtures/{fixture_id}/lineups` (or new `fixtures.py` router) |

### Frontend
| File | Change |
|------|--------|
| `App.js` | Wrap tabs in root NativeStackNavigator, add MatchDetail screen, rename Trends→Teams, update icon |
| `src/screens/LeaguesListScreen.js` | Add search bar + results, relabel section |
| `src/screens/AllMatchesView.js` | Add `onPress` to match rows → navigate to MatchDetail |
| `src/screens/MatchDetailScreen.js` | New screen (all sections) |
| `src/screens/TrendsScreen.js` → `TeamsScreen.js` | Rename file, add Next Game card |
