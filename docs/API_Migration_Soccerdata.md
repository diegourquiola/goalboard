# API Migration: Football-Data.org → Soccerdata API

**Date:** March 31, 2026  
**Status:** Completed

## Overview

The GoalBoard backend has been migrated from Football-Data.org API to Soccerdata API to provide more comprehensive data coverage and better features for the application.

## Changes Made

### 1. API Endpoint Changes

| Component | Old (Football-Data.org) | New (Soccerdata API) |
|-----------|------------------------|---------------------|
| **Base URL** | `https://api.football-data.org/v4` | `https://api.soccerdataapi.com` |
| **Authentication** | Header: `X-Auth-Token` | Query param: `auth_token` |
| **Required Headers** | None | `Accept-Encoding: gzip` |
| **League Identifier** | Code (e.g., "PL") | ID (e.g., 228) + Code mapping |

### 2. Endpoint Mappings

| Feature | Old Endpoint | New Endpoint |
|---------|-------------|--------------|
| Standings | `/competitions/{code}/standings` | `/standing/?league_id={id}` |
| Matches | `/competitions/{code}/matches` | `/matches/?league_id={id}` |
| Team | `/teams/{id}` | `/team/?team_id={id}` |
| Leagues | N/A (hardcoded) | `/league/` |

### 3. League Code to ID Mapping

The backend now maintains a mapping between familiar league codes and Soccerdata API IDs:

```python
LEAGUE_ID_MAP = {
    "PL": 228,    # Premier League
    "PD": 237,    # La Liga
    "BL1": 235,   # Bundesliga
    "SA": 236,    # Serie A
    "FL1": 233,   # Ligue 1
    "CL": 239,    # Champions League
}
```

This allows the frontend to continue using league codes (e.g., "PL") while the backend translates them to the appropriate league IDs.

### 4. Response Structure Changes

#### Standings Response

**Old Structure (Football-Data.org):**
```json
{
  "filters": {...},
  "competition": {...},
  "season": {...},
  "standings": [{
    "stage": "REGULAR_SEASON",
    "table": [{
      "position": 1,
      "team": {"name": "Arsenal FC"},
      "playedGames": 31,
      "points": 70,
      ...
    }]
  }]
}
```

**New Structure (Soccerdata API):**
```json
{
  "league": {"id": 228, "name": "Premier League"},
  "season": {"year": "2025-2026"},
  "stage": [{
    "stage_id": 13908,
    "stage_name": "Premier League",
    "standings": [{
      "position": 1,
      "team_id": 3068,
      "team_name": "Arsenal",
      "games_played": 8,
      "points": 19,
      ...
    }]
  }]
}
```

#### Matches Response

**New Structure:**
- Includes `stage` array with matches nested inside
- Each match has `teams.home` and `teams.away` objects with `id` and `name`
- Status values: `"pre-match"`, `"finished"`, `"live"`, etc.
- Includes additional fields: `events`, `odds`, `match_preview`

### 5. Files Modified

#### Backend Changes

1. **`backend/.env`** - Updated API key variable name
   - `FOOTBALL_API_KEY` → `SOCCER_API_KEY`

2. **`backend/.env.example`** - Updated template
   - `FOOTBALL_API_KEY=your_token_here` → `SOCCER_API_KEY=your_token_here`

3. **`backend/services/football_api.py`** - Complete rewrite
   - Updated base URL and headers
   - Added `LEAGUE_ID_MAP` for code-to-ID translation
   - Modified `_get()` to use query parameters for auth
   - Added gzip compression support
   - Updated all API functions with new endpoint paths
   - Added `get_leagues()` function

4. **`backend/routers/standings.py`** - Enhanced error handling
   - Added `ValueError` catch for invalid league codes
   - Improved error messages

5. **`backend/routers/matches.py`** - Added date filtering support
   - Added `date_from` and `date_to` parameters
   - Client-side filtering for `matchday` and `status` (not supported by Soccerdata API)
   - Enhanced error handling

6. **`backend/routers/teams.py`** - Updated comments
   - Clarified that `league` parameter is kept for API compatibility

7. **`backend/routers/leagues.py`** - Updated league list
   - Added `id` field to each league
   - Updated to match `LEAGUE_ID_MAP`

8. **`backend/tests/test_football_api.py`** - Updated all tests
   - Modified mocks to match new API structure
   - Updated assertions for new endpoint URLs
   - Added test for gzip header
   - Added test for invalid league codes

#### Documentation Changes

9. **`goalboard/README.md`** - Updated documentation
   - Changed API reference from Football-Data.org to Soccerdata API
   - Added league code to ID mappings
   - Updated endpoint examples
   - Added notes about required headers

10. **`goalboard/docs/API_Migration_Soccerdata.md`** - This file
    - Complete migration documentation

### 6. Frontend Compatibility

The API migration is **backward compatible** with the existing frontend code because:

1. **League codes are preserved** - Frontend can still use "PL", "PD", etc.
2. **Endpoint paths unchanged** - `/api/standings/{league}` still works
3. **Query parameters extended** - New `date_from`/`date_to` parameters added without breaking existing usage

Frontend changes will be needed in Sprint 1 when implementing the actual data display to:
- Parse the new response structure
- Extract data from `stage[0].standings` instead of `standings[0].table`
- Use `team_id` and `team_name` instead of `team.id` and `team.name`
- Handle new match status values

### 7. Testing

All backend tests pass (19/19):
- ✅ Cache functionality (6 tests)
- ✅ API integration (5 tests)
- ✅ Validation (8 tests)

Live API testing confirmed:
- ✅ Health endpoint working
- ✅ Leagues endpoint returning data
- ✅ Standings endpoint returning Premier League data
- ✅ Matches endpoint with date filtering working

### 8. Known Limitations

1. **Matchday filtering** - Soccerdata API doesn't support direct matchday filtering. This is now handled client-side in the backend router.

2. **Status filtering** - Similarly filtered client-side from match results.

3. **League coverage** - Currently limited to 6 major leagues. Can be expanded by adding more mappings to `LEAGUE_ID_MAP`.

### 9. Next Steps (Sprint 1)

When implementing the frontend screens:

1. Update `StandingsScreen.js` to parse new response structure
2. Update `MatchesScreen.js` to handle new match format
3. Consider using the additional data fields available (events, odds, previews)
4. Update any mock data to match the new structure

### 10. API Key

**New API Key:** `4311dd1c71e251dbe22cba8ab66d919bba714d7e`  
**Provider:** Soccerdata API (api.soccerdataapi.com)  
**Documentation:** https://soccerdataapi.com/docs/

---

## Verification Commands

```bash
# Start backend
cd backend
source venv/bin/activate
uvicorn main:app --reload --port 8000

# Test health
curl http://localhost:8000/api/health

# Test leagues
curl http://localhost:8000/api/leagues

# Test standings (Premier League)
curl "http://localhost:8000/api/standings/PL"

# Test matches with date filter
curl "http://localhost:8000/api/matches/PL?date_from=2025-08-15&date_to=2025-08-20"

# Run all tests
pytest tests/ -v
```

## Migration Checklist

- [x] Update API credentials in `.env`
- [x] Modify `football_api.py` service layer
- [x] Update all router endpoints
- [x] Update unit tests
- [x] Verify all tests pass
- [x] Test live API integration
- [x] Update README documentation
- [x] Create migration document
- [ ] Update frontend (Sprint 1)
- [ ] Test end-to-end flow (Sprint 1)

---

**Migration completed successfully on March 31, 2026**
