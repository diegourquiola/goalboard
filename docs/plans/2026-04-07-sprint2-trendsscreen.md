# Sprint 2: TrendsScreen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the TrendsScreen chart placeholder with bar charts comparing teams across the league — points comparison (selected team highlighted) and goals scored vs conceded overview.

**Architecture:** All chart data comes from the standings endpoint (`/api/standings/{league}`) which is already fetched for the team picker. No extra API calls needed. The standings response includes points, goals_scored, goals_conceded for every team. Custom View-based horizontal bars give full control over per-bar colors (highlight selected team).

**Tech Stack:** React Native, Expo, Axios via existing `src/services/api.js`

---

## Context: What Already Exists

- `frontend/src/screens/TrendsScreen.js` — scaffold with league picker + team picker working; chart area is placeholder
- `frontend/src/services/api.js` — Axios instance, base URL `http://localhost:8000`
- `frontend/src/components/LoadingState.js` — spinner + message prop
- `frontend/src/components/ErrorState.js` — error message + `onRetry` callback

## Files Changed

| File | Change |
|------|--------|
| `frontend/src/screens/TrendsScreen.js` | Add bar charts to chart area, store full standings data |

## Screen Layout

```
┌─────────────────────────────────────────┐
│  [PL] [La Liga] [Bundesliga] [Serie A]… │  ← league pills (horizontal scroll)
├─────────────────────────────────────────┤
│  [Arsenal] [Chelsea] [Liverpool] […]    │  ← team pills (horizontal scroll, from standings)
├─────────────────────────────────────────┤
│  Points Comparison                      │
│  ████████████████████████  Arsenal  65  │  ← blue (selected)
│  ██████████████████████   Liverpool 61  │  ← gray
│  █████████████████████    Man City  58  │  ← gray
│  …                                      │
├─────────────────────────────────────────┤
│  Goals Overview                         │
│  Arsenal   █████████ 52  ████ 24        │  ← green=scored, red=conceded
│  Liverpool █████████ 49  █████ 28       │
│  …                                      │
└─────────────────────────────────────────┘
```

---

## Task 1: Store full standings data and build charts

- [x] **Step 1:** Modify `fetchTeams` to store full standings rows (not just id/name)
- [x] **Step 2:** When a team is selected, derive top-10 chart data from stored standings
- [x] **Step 3:** Render Points Comparison as custom horizontal bars (selected team = blue, others = gray)
- [x] **Step 4:** Render Goals Overview as paired horizontal bars (green = scored, red = conceded)
- [x] **Step 5:** Add section headers, legend, pull-to-refresh on the ScrollView
- [x] **Step 6:** Verify: league switch clears selection, team switch updates charts, loading/error states work

## Task 2: UI Polish

- [x] **Step 1:** Ensure consistent pill styling, spacing, and colors match StandingsScreen/MatchesScreen
- [x] **Step 2:** Add pull-to-refresh to chart ScrollView

## Acceptance Criteria

- [ ] User selects a team → two bar charts appear comparing that team against top 10 in the league
- [ ] Selected team's bar is visually highlighted (blue) in the points chart
- [ ] Goals chart shows scored (green) vs conceded (red) for each team
- [ ] Loading state shown while standings fetch
- [ ] Error state with retry shown on API failure
- [ ] Changing league clears team selection and reloads
- [ ] Pull-to-refresh works on chart area
