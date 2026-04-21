# Match Detail Tabs Design

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the single-scroll `MatchDetailScreen` with a three-tab swipeable layout (Details · Stats · Lineups) that adds match events and full match statistics.

**Date:** 2026-04-21

---

## Architecture

`MatchDetailScreen` restructures into two vertically-stacked zones:

1. **Pinned match header** (`View`, not scrollable) — existing score card (teams, score, venue, date, live minute). Always visible regardless of active tab.
2. **Swipeable TabView** (`react-native-tab-view`, `flex: 1`) — three pages below the header. A custom tab bar sits between the header and the page content.

Each tab page is its own `ScrollView` (vertical). React Native handles horizontal swipe (tab switching) and vertical scroll (within a tab) independently — no gesture conflict.

**New dependency:** `react-native-tab-view` — pure JS, works in Expo Go, no native module required.

---

## Tab Bar

- Three pill-style tab buttons: **DETAILS · STATS · LINEUPS**
- Active tab highlighted with `colors.accent` background / white text
- Inactive tabs: muted text, transparent background
- Sits directly below the pinned header, above the page content
- Styled to match existing `BlurView` header aesthetic (same border-radius language)

---

## Tab: Details (index 0, default)

Sections rendered top-to-bottom inside a `ScrollView`:

### Events section
- Fetched from `GET /api/fixtures/{fixture_id}/events` on mount
- Rendered as a vertical timeline list inside the existing card style
- Each row shows: **minute** | **icon** | **player name** | **team logo**
- Icon mapping:
  - Goal → ⚽ (accent color)
  - Own Goal → ⚽ (destructive/red)
  - Yellow Card → 🟨
  - Red Card → 🟥
  - Substitution → ↕ (muted)
- If `status === 'pre-match'` or events array is empty: show "No events yet."
- Live polling: when `match.status === 'live'`, re-fetch events every 60 seconds

### H2H, Recent Form, League Table
Exact same rendering as today — no changes to these sections.

---

## Tab: Stats (index 1)

- Fetched lazily: `GET /api/fixtures/{fixture_id}/statistics` only when the user first switches to this tab (uses a `fetched` ref to avoid re-fetching)
- Renders `StatBar` components (already exists in the file) for each stat pair
- Live polling: when `match.status === 'live'`, re-fetch stats every 60 seconds
- If `status === 'pre-match'` or no data returned: show "Match stats will be available once the game begins."

**Stats displayed (in order):**
1. Shots on Goal
2. Shots off Goal
3. Total Shots
4. Blocked Shots
5. Shots insidebox
6. Shots outsidebox
7. Fouls
8. Corner Kicks
9. Offsides
10. Ball Possession (%)
11. Yellow Cards
12. Red Cards
13. Goalkeeper Saves
14. Passes Accurate
15. Pass Accuracy (%)

---

## Tab: Lineups (index 2)

Exact same pitch formation + substitutes content as the current screen, moved into its own tab page (`ScrollView`). No logic changes — just relocated.

---

## Backend: New Endpoints

### `GET /api/fixtures/{fixture_id}/statistics`

Added to `backend/routers/fixtures.py`.

Calls `GET /fixtures/statistics?fixture={fixture_id}` on API-Football.

Returns:
```json
[
  {
    "team_id": 33,
    "team_name": "Manchester United",
    "team_logo": "https://...",
    "stats": {
      "Shots on Goal": 4,
      "Shots off Goal": 2,
      "Total Shots": 8,
      "Blocked Shots": 2,
      "Shots insidebox": 5,
      "Shots outsidebox": 3,
      "Fouls": 11,
      "Corner Kicks": 5,
      "Offsides": 1,
      "Ball Possession": 52,
      "Yellow Cards": 2,
      "Red Cards": 0,
      "Goalkeeper Saves": 3,
      "Passes accurate": 387,
      "Passes": 432,
      "Pass Accuracy": 89
    }
  },
  { "team_id": 40, ... }
]
```

TTL: 30s (live match data). Parser extracts `value` fields by `type` string, handles `"52%"` → `52` for possession and pass accuracy.

The frontend identifies home vs away stats by matching each object's `team_id` against `match.teams.home.id` — not by array position.

### `GET /api/fixtures/{fixture_id}/events`

Added to `backend/routers/fixtures.py`.

Calls `GET /fixtures/events?fixture={fixture_id}` on API-Football.

Returns:
```json
[
  {
    "minute": 23,
    "extra_minute": null,
    "team_id": 33,
    "team_name": "Manchester United",
    "team_logo": "https://...",
    "player_name": "Rashford",
    "assist_name": "Bruno Fernandes",
    "type": "Goal",
    "detail": "Normal Goal"
  },
  {
    "minute": 45,
    "extra_minute": 2,
    "team_id": 40,
    "team_name": "Liverpool",
    "team_logo": "https://...",
    "player_name": "Salah",
    "assist_name": null,
    "type": "Card",
    "detail": "Yellow Card"
  }
]
```

TTL: 30s. Sorted by minute ascending.

---

## Data Flow

```
mount → fetch events + lineups + h2h + form + standings (parallel)
      → Stats tab: fetch on first view only

live match → setInterval 60s → re-fetch events + stats
           → clearInterval on unmount
```

State shape added to `MatchDetailScreen`:
```javascript
const [activeTab, setActiveTab]   = useState(0);
const [events,    setEvents]      = useState([]);
const [matchStats, setMatchStats] = useState(null);  // array of 2 team-stat objects
const statsFetched = useRef(false);

// loading / error keys added:
// loading.events, loading.stats
// errors.events, errors.stats
```

---

## Files Changed

| File | Change |
|---|---|
| `backend/routers/fixtures.py` | Add `/statistics` and `/events` endpoints |
| `backend/services/football_api.py` | Add `get_fixture_statistics()` and `get_fixture_events()` |
| `frontend/src/screens/MatchDetailScreen.js` | Full restructure: pinned header + TabView + 3 tab pages |
| `frontend/package.json` | Add `react-native-tab-view` |

No new frontend files needed — all tab content stays inside `MatchDetailScreen.js`.

---

## Error Handling

- Events fail to load → show `RetryButton` (existing component)
- Stats fail to load → show `RetryButton`
- Pre-match fixture → Stats tab shows placeholder message; Events tab shows "No events yet."
- Tab switch before data arrives → `InlineSpinner` (existing component)

---

## Testing

Backend:
- `test_get_fixture_statistics_returns_two_teams` — mock API-Football response, assert two team objects returned with expected stat keys
- `test_get_fixture_events_returns_sorted_events` — assert events sorted by minute, goal/card/subst all parsed correctly
- `test_get_fixture_statistics_handles_empty` — assert empty list returned when API returns no data
- `test_get_fixture_events_handles_empty` — assert empty list returned

Frontend: Manual testing on live/finished fixture — verify stats bars render, events timeline shows goals and cards, swipe gestures switch tabs, live polling fires on live match.
