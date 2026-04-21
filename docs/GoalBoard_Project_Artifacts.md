# GoalBoard
### A Soccer Analytics Dashboard
**Mobile Application · React Native + Python**

**Individual Software Engineering Project — Spring 2026**

*Diego Urquiola*
*Software Engineering ITI-4170*
*Dr. Lakisha Simmons*

---

## Table of Contents

1. [Project Overview and Problem Statement](#1-project-overview-and-problem-statement)
2. [Process Model and Justification](#2-process-model-and-justification)
3. [Gantt Chart](#3-gantt-chart)
4. [Requirements and Analysis](#4-requirements-and-analysis)
5. [High-Level System Architecture](#5-high-level-system-architecture)
6. [Quality and Testing Plan](#6-quality-and-testing-plan)
7. [Support and Improvement](#7-support-and-improvement)

---

## 1. Project Overview and Problem Statement

### 1.1 Problem Statement

Soccer fans who follow multiple leagues often struggle to get a consolidated, clean view of standings, match results, and team performance trends. Existing apps are bloated with ads, social features, and betting integrations that distract from the core data. There is a need for a focused, lightweight mobile application that presents soccer statistics clearly and allows fans to quickly analyze team and player performance across a season.

### 1.2 Project Overview

GoalBoard is a mobile application built with React Native (Expo SDK 55) on the frontend and Python (FastAPI) on the backend. It connects to the API-Football v3 REST API to fetch real-time and historical soccer data. The app provides comprehensive soccer analytics across two primary tabs — Leagues and Teams — with deep navigation into match detail, team profiles, and player statistics.

The application demonstrates a complete software engineering lifecycle including requirements analysis, architectural design, iterative implementation across four sprints, quality assurance through automated testing, and deployment via EAS (Expo Application Services).

### 1.3 Target Users

The primary users are casual-to-dedicated soccer fans who want quick access to league data without the clutter of mainstream sports apps. Secondary users include fantasy soccer players and amateur analysts who want to spot form trends, compare head-to-head records, and track individual player statistics.

### 1.4 Key Features

- **League browsing:** Featured competitions grid (Premier League, La Liga, Bundesliga, Serie A, Ligue 1, Champions League) with full-text search by league name or country
- **Standings:** Full league table with position zones (Champions League spots, relegation) color-coded per competition
- **Matches:** Season fixture list grouped by date with status filters; auto-scrolls to the next upcoming match; live matches auto-poll every 60 seconds
- **Top Scorers:** Per-league goal and assist leaderboard with player navigation
- **Match Detail:** Score header, match statistics (possession, shots, corners, passes, fouls), mini league table for both teams, head-to-head history (tappable), recent form badges, and starting XI on a visual pitch with substitutes list
- **Team Profile:** Season stats chips, next fixture card, recent results (tappable), full squad by position, and a season fixtures browser (all past results + all upcoming matches)
- **Player Profile:** Full bio, physical attributes, and per-competition season statistics
- **Team Analytics:** Goals scored/conceded sparkline charts, form badges, win-rate stats, and a global team search by name
- **Dark/light mode** with system-aware blur effects on header cards and the tab bar
- **Haptic feedback** throughout all interactive elements
- **Backend TTL cache** reducing redundant API calls and improving perceived speed
- **Graceful error handling** with per-section retry buttons and pull-to-refresh on every screen

---

## 2. Process Model and Justification

### 2.1 Selected Model: Agile (Scrum)

This project follows the Agile methodology using the Scrum framework, organized into five sprints (Sprint 0 through Sprint 4). Scrum was selected for several reasons that align with the nature of this project:

**Iterative delivery:** With only 5 weeks available, the project benefits from delivering working increments each week rather than attempting a single waterfall delivery. Each sprint produces a demonstrable, testable feature set.

**Adaptability:** As a solo developer integrating with an external API, unexpected issues (rate limits, data format changes, missing fields) are likely. Scrum's sprint retrospective model allows the plan to adapt each week based on what was learned.

**Solo Scrum adaptation:** While Scrum is typically team-based, the core principles (sprint planning, daily progress checks, sprint review, retrospective) translate well to individual work. The student acts as both Product Owner and Developer, with the instructor serving as the stakeholder.

**Risk front-loading:** Sprint 0 handles all planning and environment setup, and Sprint 1 tackles the riskiest element (API integration) first. This ensures that if problems arise, there is time to adapt.

### 2.2 Sprint Structure

| Sprint | Weeks | Focus |
|--------|-------|-------|
| Sprint 0 | Week 1 | Planning, requirements, design, environment setup |
| Sprint 1 | Week 2 | API integration, standings screen, matches screen, backend caching |
| Sprint 2 | Week 3 | Charts, team analytics tab, UI polish, error handling, dark mode |
| Sprint 3 | Week 4 | League search, match detail (H2H, lineups, form, stats), team/player profiles, top scorers |
| Sprint 4 | Week 5 | Haptics, blur UI, live polling, team fixtures browser, team search, season rollover fix, UX polish |

---

## 3. Gantt Chart

| Phase / Task | Week 1 Mar 23–29 | Week 2 Mar 30–Apr 5 | Week 3 Apr 6–12 | Week 4 Apr 13–19 | Week 5 Apr 20–26 |
|---|:---:|:---:|:---:|:---:|:---:|
| **Sprint 0: Planning & Setup** | █ | | | | |
| Requirements & analysis | █ | | | | |
| Architecture & design | █ | | | | |
| Dev environment setup | █ | | | | |
| **Sprint 1: Core Features** | | █ | | | |
| API integration layer + caching | | █ | | | |
| Standings screen | | █ | | | |
| Matches screen with filters | | █ | | | |
| **Sprint 2: Analytics & Polish** | | | █ | | |
| Team analytics tab (charts, form) | | | █ | | |
| Dark/light mode | | | █ | | |
| Error handling & loading states | | | █ | | |
| **Sprint 3: Deep Navigation** | | | | █ | |
| League search (name + country) | | | | █ | |
| Match detail screen (H2H, lineups, stats) | | | | █ | |
| Team profile + squad | | | | █ | |
| Player profile + stats | | | | █ | |
| Top scorers view | | | | █ | |
| Root stack navigation | | | | █ | |
| **Sprint 4: Polish & Delivery** | | | | | █ |
| Haptics throughout app | | | | | █ |
| Blur UI (tab bar, header cards) | | | | | █ |
| Live match auto-polling | | | | | █ |
| Team fixtures browser (full season) | | | | | █ |
| Team name search | | | | | █ |
| EAS build configuration | | | | | █ |
| Backend automated tests | | | | | █ |
| Documentation & presentation prep | | | | | █ |

---

## 4. Requirements and Analysis

### 4.1 Functional Requirements

| ID | Requirement | Priority | Sprint | Status |
|----|-------------|----------|--------|--------|
| FR-01 | System shall fetch and display current league standings from API-Football | Must Have | Sprint 1 | ✅ Done |
| FR-02 | System shall display match results grouped by date with status filtering | Must Have | Sprint 1 | ✅ Done |
| FR-03 | System shall cache API responses with configurable TTL to reduce redundant network calls | Must Have | Sprint 1 | ✅ Done |
| FR-04 | System shall display a loading state while data is being fetched | Must Have | Sprint 1 | ✅ Done |
| FR-05 | System shall generate sparkline charts showing goals scored/conceded trends over a season | Must Have | Sprint 2 | ✅ Done |
| FR-06 | System shall display team form visualization (last 5 match results as W/D/L badges) | Should Have | Sprint 2 | ✅ Done |
| FR-07 | System shall handle API errors gracefully with per-section retry buttons | Must Have | Sprint 2 | ✅ Done |
| FR-08 | System shall support dark and light mode with system-aware theming | Should Have | Sprint 2 | ✅ Done |
| FR-09 | System shall allow searching leagues by name and by country | Should Have | Sprint 3 | ✅ Done |
| FR-10 | System shall display a match detail screen with score, venue, and kickoff time | Must Have | Sprint 3 | ✅ Done |
| FR-11 | System shall display head-to-head history between two teams (last 5 meetings) | Should Have | Sprint 3 | ✅ Done |
| FR-12 | System shall display starting lineups on a visual pitch formation diagram | Should Have | Sprint 3 | ✅ Done |
| FR-13 | System shall display recent form (last 5 results) for each team on match detail | Should Have | Sprint 3 | ✅ Done |
| FR-14 | System shall display a team profile with season stats, next match, recent results, and squad | Must Have | Sprint 3 | ✅ Done |
| FR-15 | System shall display a player profile with bio and per-competition season statistics | Could Have | Sprint 3 | ✅ Done |
| FR-16 | System shall display a top scorers leaderboard per league | Should Have | Sprint 3 | ✅ Done |
| FR-17 | System shall auto-refresh live match data every 60 seconds | Could Have | Sprint 4 | ✅ Done |
| FR-18 | System shall allow users to browse all season fixtures for a team (past and upcoming) | Should Have | Sprint 4 | ✅ Done |
| FR-19 | System shall allow searching for any team globally by name | Should Have | Sprint 4 | ✅ Done |
| FR-20 | System shall provide haptic feedback on all interactive elements | Could Have | Sprint 4 | ✅ Done |

### 4.2 Non-Functional Requirements

| ID | Requirement | Category | Status |
|----|-------------|----------|--------|
| NFR-01 | App shall load screen content within 3 seconds on a standard mobile connection | Performance | ✅ Met via TTL cache |
| NFR-02 | App shall function on both iOS and Android via React Native / Expo | Portability | ✅ Met |
| NFR-03 | Codebase shall maintain clear separation between API, business logic, and UI layers | Maintainability | ✅ Met |
| NFR-04 | App shall degrade gracefully when the external API is temporarily unavailable | Reliability | ✅ Met via error states + retry |
| NFR-05 | All API keys shall be stored in environment variables, never hardcoded | Security | ✅ Met |
| NFR-06 | UI shall follow platform conventions and be navigable without a tutorial | Usability | ✅ Met |
| NFR-07 | Current season shall be computed automatically at server startup without manual updates | Maintainability | ✅ Met |

### 4.3 User Stories

| ID | User Story | Acceptance Criteria | Status |
|----|------------|---------------------|--------|
| US-01 | As a soccer fan, I want to view current league standings so I can see how teams are ranked. | Standings display rank, team logo, points, MP, GD. Position zones color-coded. Tapping a team opens team profile. | ✅ Done |
| US-02 | As a user, I want to browse match results and upcoming fixtures so I can review scores and plan watching. | Match list grouped by date, auto-scrolls to next upcoming match. Status filters (All, Today, This Week, Results). | ✅ Done |
| US-03 | As a user, I want to see a team's performance trends over the season. | Sparkline chart shows goals scored/conceded per matchday. Win %, average goals displayed. | ✅ Done |
| US-04 | As a user, I want the app to show helpful error messages when data can't load. | On failure, each section shows "tap to retry" button. Pull-to-refresh available on every screen. | ✅ Done |
| US-05 | As a user, I want to search for any league including by country name. | Typing a country name (e.g. "Spain") returns all leagues from that country alongside name matches. | ✅ Done |
| US-06 | As a user, I want to tap a match to see detailed statistics and team information. | Match detail shows score, venue, kickoff time, match stats (possession, shots, corners), H2H history, form badges, and lineups. | ✅ Done |
| US-07 | As a user, I want to see the starting lineup displayed on a pitch diagram. | Formation shown on a green pitch with player names positioned by grid coordinate. Tapping a player opens their profile. | ✅ Done |
| US-08 | As a user, I want to view a team's full profile including their squad and next match. | Team profile shows season stats, next fixture card, last 5 results (tappable), full squad grouped by position. | ✅ Done |
| US-09 | As a user, I want to see all of a team's fixtures for the season in one place. | Season fixtures screen shows all past results and upcoming matches split into two labeled sections, auto-scrolling to upcoming. | ✅ Done |
| US-10 | As a user, I want to search for any team by name across all leagues. | Team search bar returns matching teams with logo and country. Tapping navigates to team profile. | ✅ Done |
| US-11 | As a user, I want to view a player's detailed statistics. | Player profile shows photo, age, nationality, height, weight, and per-competition stats (appearances, goals, assists, rating). | ✅ Done |

---

## 5. High-Level System Architecture

### 5.1 Architecture Overview

GoalBoard uses a three-tier architecture with clear separation of concerns:

1. **Presentation Layer (React Native / Expo SDK 55):** Mobile UI with two primary bottom tabs (Leagues, Teams) and a root native stack for screen navigation. Implements theming, haptic feedback, blur effects, and per-screen pull-to-refresh.

2. **Backend API Layer (Python / FastAPI):** Lightweight REST API that proxies requests to API-Football v3, applies TTL-based in-memory caching, transforms response shapes for the mobile client, and handles validation and error responses.

3. **External Data Layer (API-Football v3):** Third-party REST API providing real-time and historical soccer data including fixtures, standings, lineups, player statistics, and head-to-head records for leagues worldwide.

### 5.2 Screen and Navigation Map

```
Root Stack Navigator
├── MainTabs (Bottom Tab Navigator)
│   ├── Leagues Tab
│   │   └── LeaguesTab
│   │       └── LeagueDetailScreen (Standings / Matches / Top Scorers)
│   │           ├── StandingsView
│   │           ├── AllMatchesView
│   │           └── TopScorersView
│   └── Teams Tab
│       └── TeamsScreen (team analytics + search)
│
├── MatchDetail (shared stack screen)
├── TeamDetail (shared stack screen)
│   └── → TeamFixtures (full season fixtures)
└── PlayerDetail (shared stack screen)
```

Any tab can push MatchDetail, TeamDetail, or PlayerDetail without losing tab state, enabled by the root NativeStackNavigator wrapping the bottom tab navigator.

### 5.3 Backend API Endpoints

| Endpoint | Description | Cache TTL |
|----------|-------------|-----------|
| `GET /api/standings/{league}` | League table — accepts code (`PL`) or numeric ID (`39`) | 5 min |
| `GET /api/matches/{league}` | Season fixtures with optional date/status filters | 30s–5 min |
| `GET /api/leagues` | Featured league metadata | 1 hr |
| `GET /api/leagues/search?q=NAME` | Search leagues by name or country | 1 hr |
| `GET /api/h2h/{team1_id}/{team2_id}` | Last 5 head-to-head fixtures | 5 min |
| `GET /api/fixtures/{fixture_id}/lineups` | Starting XIs and substitutes for a fixture | 10 min |
| `GET /api/teams/search?q=NAME` | Search teams by name globally | 5 min |
| `GET /api/teams/{team_id}/next` | Next scheduled fixture for a team | 5 min |
| `GET /api/teams/{team_id}/last-fixtures` | Last N fixtures for a team | 2 min |
| `GET /api/teams/{team_id}/season-fixtures` | All season fixtures for a team (past + upcoming) | 2 min |
| `GET /api/teams/{league}/{id}` | Team detail | 10 min |
| `GET /api/squad/{team_id}` | Full squad with positions and ages | 10 min |
| `GET /api/players/{player_id}` | Player bio and per-competition statistics | 10 min |
| `GET /api/top-scorers/{league}` | Goals leaderboard for a league | 5 min |
| `GET /api/health` | Health check | — |

### 5.4 Key Design Decisions and Tradeoffs

**Backend proxy vs. direct API calls:** All API calls are routed through the Python backend rather than calling API-Football directly from the mobile client. This protects the API key, enables server-side caching, handles data transformation, and allows the frontend to use a single stable interface independent of upstream schema changes.

**React Native with Expo vs. native development:** Expo was chosen to maximize iOS/Android code reuse. The tradeoff is slightly less access to low-level native APIs, which is acceptable for GoalBoard's feature set. EAS (Expo Application Services) was added in Sprint 4 to support proper native development builds with `expo-blur` and `expo-haptics`.

**Root NativeStack + BottomTabs composition:** Wrapping the bottom tab navigator inside a root native stack enables any tab to push shared screens (MatchDetail, TeamDetail, PlayerDetail) without duplicating screen registrations or losing tab state. The `useNavigation()` hook allows deeply nested components to navigate without prop drilling.

**In-memory TTL cache:** API responses are cached in a Python dictionary with per-endpoint TTL values. Live match endpoints use a 30-second TTL; reference data (squads, lineups) use 10-minute TTLs. This approach eliminates redundant API calls for the most common navigation patterns while keeping data reasonably fresh.

**Dynamic season computation:** `CURRENT_SEASON` is computed at server startup using the current date (July cutoff), eliminating a hardcoded year that would silently break at each season rollover.

### 5.5 User Interface Design

The app uses a card-based layout with a consistent visual language across all screens:

- **Leagues tab:** Featured league grid → League detail with three sub-tabs (Standings, Matches, Top Scorers). League search bar supports name and country queries.
- **Teams tab:** Global team search bar → League filter pills → Team selector with analytics charts, sparklines, and next match card. All elements navigate to full detail screens.
- **Shared stack screens:** Match detail, Team detail, Player detail, and Team season fixtures are accessible from anywhere in the navigation tree.
- **Theming:** Full dark/light mode with `ThemeContext`. Header cards and the tab bar use `expo-blur` for a frosted-glass effect. System colors adapt to the active theme.
- **Haptics:** `expo-haptics` provides selection, light impact, and success notification feedback on all interactive elements.

---

## 6. Quality and Testing Plan

### 6.1 Quality Goals

- **Reliability:** The app should never crash due to unexpected API responses or network failures. Every data-fetching section has an independent error state with a retry button.
- **Data accuracy:** Standings, scores, and statistics must match the source API with no calculation errors in derived values (goal difference, averages, win percentage).
- **Usability:** A new user should be able to find standings, match results, and team trends within 10 seconds of opening the app.

### 6.2 Risk Assessment

| Risk | Level | Mitigation |
|------|-------|------------|
| API rate limiting | Medium | Backend caching with TTL-based expiration per endpoint |
| API downtime or schema changes | Low | Per-section error states + retry; cached fallback data |
| Season rollover breaking data | Low | Season year computed dynamically from current date |
| Tight timeline | High | MoSCoW prioritization; "Could Have" features cut first |
| Native build compatibility | Medium | EAS build profiles configured for development, preview, and production |

### 6.3 Testing Strategy

**Unit Testing (Backend):** Python unit tests using `pytest` for API service functions, data transformation logic, and cache behavior. 28 tests covering all major service functions including `_parse_fixture`, `get_standings`, `search_leagues`, `get_h2h`, `get_fixture_lineups`, and `get_team_next_fixture`. External API calls are mocked with `unittest.mock.patch`.

**Integration Testing (Backend):** Tests verify that the full data pipeline — from mocked API response through transformation to the format expected by the frontend — produces correct output with no lost fields.

**Manual Testing (Frontend):** Exploratory testing on iOS Simulator and physical device via Expo Dev Client. Test coverage includes: navigation flows between all screens, pull-to-refresh on every screen, dark/light mode toggle, search inputs (league search by name and country, team search), live match display, empty states, error states, and retry behavior.

### 6.4 Test Results Summary

All 28 backend unit tests pass. Test areas covered:

- Fixture parsing (status mapping, score extraction, venue, statistics)
- Standings transformation (position zones, goal difference)
- League search deduplication (name + country merge)
- H2H response parsing
- Lineup parsing (startXI + substitutes)
- Team next fixture fetching
- Invalid league code error handling
- Cache TTL behavior

### 6.5 Security Considerations

- API key is stored server-side in a `.env` file excluded from version control via `.gitignore`. Never embedded in the mobile client.
- All network communication uses HTTPS.
- User input (search queries) is validated server-side with minimum length constraints (`Query(..., min_length=2)`).
- No user authentication is required (read-only public data), which minimizes the attack surface.
- `ITSAppUsesNonExemptEncryption: false` declared in `app.json` for App Store compliance.

---

## 7. Support and Improvement

### 7.1 Maintenance Strategy

Post-delivery maintenance focuses on three areas: monitoring API-Football v3 for breaking changes or endpoint deprecations; updating Expo SDK and npm dependencies quarterly to stay current with security patches; and updating `CURRENT_SEASON` logic if the July cutoff convention changes between soccer seasons. The backend `--reload` flag in development ensures any Python changes are reflected immediately without manual restarts.

### 7.2 Potential Future Improvements

- **Push notifications** for live match score updates and kickoff reminders for followed teams.
- **User accounts** with favorite teams/leagues and a personalized home feed.
- **Expanded statistics** including expected goals (xG), pass maps, and shot locations.
- **Standings history** showing week-by-week position changes as an animated chart.
- **Widgets** (iOS/Android home screen) showing the next match for a followed team.
- **Offline mode** with persistent local storage of the last fetched standings and fixtures.

### 7.3 Lessons Learned

Throughout this project, several key lessons emerged from building a full-stack mobile application as a solo developer:

**API integration complexity:** The API-Football v3 response format required significant transformation before it was useful to the frontend. Building a clean transformation layer in the backend early (Sprint 1) paid dividends throughout — adding new screens in Sprints 3 and 4 required only new endpoints, not changes to how the frontend consumed data.

**Navigation architecture matters early:** Switching from a simple tab navigator to a root-stack-plus-tabs architecture in Sprint 3 (to enable cross-tab deep navigation) required touching many files. Designing the navigation structure before building screens would have reduced this refactoring cost.

**Iterative polish compounds:** Small quality improvements added incrementally — haptics, blur effects, per-section retry buttons, live polling — each took less than an hour individually but together produced an app that feels significantly more polished than the Sprint 2 baseline.

**Agile adaptability in solo projects:** The Scrum framework worked well for managing scope. Several features originally planned for Sprint 3 (player profiles, team search) were deferred from earlier sprints without disruption because the sprint boundary provided a natural decision point to re-prioritize based on what was actually built and working.
