# Home Tab — Design Spec
**Date:** 2026-04-25

## Overview

A new Home tab added as the first (leftmost) tab in the bottom navigation and the new landing page of the app. It shows all football matches for a selected date, with featured leagues at the top and all other matches grouped by country below.

---

## Architecture

### Backend
- **New file:** `backend/routers/home.py`
- **New endpoint:** `GET /api/home/matches?date=YYYY-MM-DD`
- Calls `_get("/fixtures", {"date": date})` — the same internal call already used in `notification_service.py`
- TTL: 30s when `date` is today (live matches may update), 300s for past/future dates
- Response groups fixtures into `featured` and `countries` (see Data Shape below)
- Registered in `main.py` alongside all other routers

### Frontend
- **New file:** `src/screens/HomeTab.js` — stack navigator wrapper with shared header, same pattern as `FavoritesTab.js`
- **New file:** `src/screens/HomeScreen.js` — all screen content
- **Modified:** `src/constants/leagues.js` — add `HOME_FEATURED_IDS` array without touching the existing `LEAGUES` export
- **Modified:** `App.js` — add Home as the first tab in `MainTabs`

No existing files are restructured. All new code follows existing patterns.

---

## Featured Leagues

Defined by `HOME_FEATURED_IDS` in `constants/leagues.js`. These 9 leagues are shown at the top of the Home screen **only if they have matches on the selected date**:

| League | API-Football ID |
|---|---|
| Premier League | 39 |
| La Liga | 140 |
| Bundesliga | 78 |
| Serie A | 135 |
| Ligue 1 | 61 |
| Champions League | 2 |
| MLS | 253 |
| Europa League | 3 |
| Conference League | 848 |

These IDs are **only used on the Home tab**. The existing `LEAGUES` constant (used by the Leagues and Matches tabs) is unchanged.

---

## UI Structure

### Header
Same as all other tabs: GoalBoard logo + app name on the left, profile icon on the right.

### DateNavBar
A single row at the top of the screen content:
- `<` arrow — go back 1 day
- Date label (center) — tappable, opens full-month calendar modal
- `>` arrow — go forward 1 day

**Label format:**
- offset -2 or less from today: `Thu Apr 24`
- offset -1: `Yesterday`
- offset 0: `Today` ← default on mount
- offset +1: `Tomorrow`
- offset +2 or more: `Mon Apr 28`

**Calendar modal:** Full-month grid of day buttons. Tapping a day sets `selectedDate` and closes the modal.

### Featured Leagues Section
Rendered first in the scroll view. For each league in `HOME_FEATURED_IDS` that has at least one match on the selected date:

- **League header row:** league logo + league name + country name (left), heart icon (right)
  - Heart reflects `useFavorites` state for that league — tapping toggles the favorite
- **Match rows:** one per match, same `MatchRow` format used in `MatchesScreen`:
  - Kickoff time (or live status: `1H`, `HT`, `FT`, etc.)
  - Home team name + away team name
  - Score (if available)
  - `MatchBellIcon` on the right
  - Tapping the row navigates to `MatchDetail`

Featured leagues with no matches on the selected date are not rendered at all.

### Country Sections
Rendered below featured leagues. One collapsible row per country that has matches on the selected date.

**Country row (collapsed):** country flag emoji + country name + total match count + chevron  
**Country row (expanded):** leagues within that country, sorted by tier (first division first via a known-league priority list; unknown leagues sort alphabetically after)

Each league within a country shows its matches in the same `MatchRow` format.

**Default state on load:**
- Countries where the user has a favorited league: expanded automatically
- All other countries: collapsed

---

## Data Flow

### State
```
selectedDate    — JS Date object, defaults to today
calendarVisible — boolean, controls calendar modal
matches         — { featured: [...], countries: [...] } or null
loading         — boolean
error           — string or null
refreshing      — boolean (pull-to-refresh)
```

### Fetch lifecycle
1. On mount: fetch for today
2. On `selectedDate` change: fetch for new date
3. Pull-to-refresh: refetch current date
4. No auto-refresh — consistent with the rest of the app

### Backend response shape
```json
{
  "featured": [
    {
      "league_id": 39,
      "league_name": "Premier League",
      "league_logo": "https://...",
      "country": "England",
      "matches": [
        {
          "fixture_id": 123,
          "date": "2026-04-25T15:00:00+00:00",
          "status": "FT",
          "home": { "id": 1, "name": "Arsenal", "logo": "https://..." },
          "away": { "id": 2, "name": "Chelsea", "logo": "https://..." },
          "score": { "home": 2, "away": 1 }
        }
      ]
    }
  ],
  "countries": [
    {
      "country": "France",
      "country_flag": "🇫🇷",
      "leagues": [
        {
          "league_id": 61,
          "league_name": "Ligue 1",
          "league_logo": "https://...",
          "tier": 1,
          "matches": [...]
        }
      ]
    }
  ]
}
```

Match objects use the same shape as `_parse_fixture` already returns — no new parsing logic, only grouping logic in the new endpoint.

`useFavorites()` is called once at the screen level and passed down to avoid redundant Supabase calls per league block.

---

## Edge Cases

| Scenario | Behaviour |
|---|---|
| No matches on selected date | Centered "No matches on this date" message — no error state |
| Featured league has no matches | Block not rendered |
| API failure | `ErrorState` component with retry button |
| Unauthenticated user taps heart/bell | Redirects to Auth screen (same as rest of app) |
| Any date in past or future | No restriction — API returns empty if no data |

---

## Files Changed

| File | Change |
|---|---|
| `backend/routers/home.py` | New file |
| `backend/main.py` | Register new router |
| `frontend/src/screens/HomeTab.js` | New file |
| `frontend/src/screens/HomeScreen.js` | New file |
| `frontend/src/constants/leagues.js` | Add `HOME_FEATURED_IDS` |
| `frontend/App.js` | Add Home as first tab |
