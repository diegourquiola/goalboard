# Sprint 2 Design: TrendsScreen + Error Handling Polish

**Date:** 2026-04-07  
**Sprint:** Sprint 2 (Apr 13–19, 2026)  
**Project:** GoalBoard — React Native + FastAPI soccer stats app

---

## Requirements Addressed

| ID | Requirement | Priority | Notes |
|----|-------------|----------|-------|
| FR-05 | Line charts: goals scored/conceded trends over a season | Must Have | Main deliverable |
| FR-06 | Team form visualization (last 5 results) | Should Have | Done in Sprint 1 (team detail modal) |
| FR-07 | Graceful API error handling with user-friendly messages | Must Have | Polish across all screens |
| FR-08 | Multiple league selection | Could Have | Done in Sprint 1 |

---

## 1. TrendsScreen

### Approach: Team Comparison Bar Charts (Approach A)

Instead of per-match line charts, the TrendsScreen uses bar charts comparing the selected team against the top 10 in the league. All data comes from the standings endpoint — no extra API calls needed.

### Flow

1. **League selector** — same horizontally scrollable pill bar used in StandingsScreen/MatchesScreen. Defaults to Premier League (PL).
2. **Team picker** — on league change, fetch `/api/standings/{league}` to get full standings. Render teams as horizontally scrollable pills. No team is selected by default; screen shows a prompt.
3. **Charts** — on team select, render two bar chart sections from the already-loaded standings data:
   - **Points Comparison** — horizontal bars for top 10 teams, selected team highlighted in blue (#2563EB), others in gray (#D1D5DB)
   - **Goals Overview** — paired horizontal bars per team showing goals scored (green #16A34A) vs goals conceded (red #DC2626)

### Component structure

```
TrendsScreen
├── LeaguePicker (ScrollView, same pattern as other screens)
├── TeamPicker (ScrollView of pills from standings)
│   ├── LoadingState (while standings load)
│   └── ErrorState (if standings fail)
└── ChartArea (shown after team selected)
    ├── Points Comparison (custom HorizontalBar components in a card)
    └── Goals Overview (paired HorizontalBar components with legend)
```

### State

| State var | Type | Purpose |
|-----------|------|---------|
| `league` | string | Selected league code |
| `standings` | array | Full standings rows (used for both team picker and charts) |
| `teamsLoading` | bool | Loading state for standings |
| `teamsError` | string\|null | Error for standings |
| `selectedTeam` | object\|null | Full standings row for selected team |
| `refreshing` | bool | Pull-to-refresh state |

### Data processing

Charts are derived directly from `standings.slice(0, 10)` — no async fetch needed when a team is selected. `maxPoints` and `maxGoals` are computed to normalize bar widths.

---

## 2. Error Handling Polish (FR-07)

### Current state

All three screens use `ErrorState` with retry. Error messages are already specific (`e.response?.data?.detail ?? 'Failed to load X.'`). The main gaps are:

1. **TrendsScreen** will need the same pattern applied consistently
2. **Network errors** (no `e.response`) currently fall through to the generic fallback — this is acceptable
3. No changes needed to StandingsScreen or MatchesScreen; they already handle errors correctly

### What changes

- TrendsScreen implements the same error/loading/empty pattern as the other screens
- No rework of existing screens needed

---

## 3. Out of Scope for Sprint 2

- Matchday-number filtering (API-Football free tier does not support matchday parameter)
- Dark mode
- Player-level stats
- Push notifications

---

## 4. Files Changed

| File | Change |
|------|--------|
| `frontend/src/screens/TrendsScreen.js` | Full implementation (replaces placeholder) |
| No other files | Existing screens already satisfy FR-07 |

---

## 5. Acceptance Criteria

- [x] US-03: User selects a team → two bar charts appear comparing that team against top 10 in the league
- [x] Selected team's bar is visually highlighted (blue) in the points chart
- [x] Goals chart shows scored (green) vs conceded (red) for each team with legend
- [x] Loading state shown while standings fetch
- [x] Error state with retry shown on API failure
- [x] Changing league clears team selection and reloads team list
- [x] Pull-to-refresh works on chart area
