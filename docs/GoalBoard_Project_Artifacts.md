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

Soccer fans who follow multiple leagues often struggle to get a consolidated, clean view of standings, match results, and team performance trends. Existing apps are bloated with ads, social features, and betting integrations that distract from the core data. There is a need for a focused, lightweight mobile application that presents soccer statistics clearly, allows fans to quickly analyze team and player performance across a season, and delivers real-time match updates for the teams they follow.

### 1.2 Project Overview

GoalBoard is a mobile application built with React Native (Expo SDK 55) on the frontend and Python (FastAPI) on the backend. It connects to the API-Football v3 REST API to fetch real-time and historical soccer data. The app provides comprehensive soccer analytics across three primary tabs — Leagues, Teams, and Favorites — with deep navigation into match detail, team profiles, and player statistics.

User accounts are powered by Supabase Auth, supporting email/password sign-up, Google OAuth, and Apple Sign-In. Sessions persist indefinitely until the user manually logs out. Authenticated users can save favorite leagues, teams, and players, and receive push notifications for live match events and pre-match alerts for their favorited teams. The backend is deployed on Render and auto-deploys on every push to the main branch.

The application demonstrates a complete software engineering lifecycle including requirements analysis, architectural design, iterative implementation across five sprints, quality assurance through automated testing, and deployment via EAS (Expo Application Services).

### 1.3 Target Users

The primary users are casual-to-dedicated soccer fans who want quick access to league data without the clutter of mainstream sports apps. Secondary users include fantasy soccer players and amateur analysts who want to spot form trends, compare head-to-head records, track individual player statistics, and receive instant match alerts for their favorite teams.

### 1.4 Key Features

- **League browsing:** Featured competitions grid (Premier League, La Liga, Bundesliga, Serie A, Ligue 1, Champions League) with scrollable full-text search by league name or country; X button clears search and dismisses keyboard
- **Standings:** Full league table with position zones (Champions League spots, relegation) color-coded per competition
- **Matches:** Season fixture list grouped by date with status filters; auto-scrolls to the next upcoming match; live matches auto-poll every 60 seconds
- **Top Scorers / Top Assists:** Per-league goal and assist leaderboard with player navigation
- **Match Detail:** Score header, match statistics (possession, shots, corners, passes, fouls), mini league table for both teams, head-to-head history (tappable), recent form badges, and starting XI on a visual pitch with substitutes list and player ratings
- **Team Profile:** Season stats chips, next fixture card, recent results (tappable), full squad by position, transfers section, and a season fixtures browser (all past results + all upcoming matches)
- **Player Profile:** Full bio, physical attributes, and per-competition season statistics
- **Team Analytics:** Goals scored/conceded sparkline charts, actual last-5-match W/D/L form badges, win-rate stats, and a scrollable global team search by name with keyboard-dismiss X button
- **User Authentication:** Email/password (8+ chars, letter, number, symbol required), Google OAuth, Apple Sign-In; sessions persist indefinitely until manual logout
- **Favorites:** Dedicated Favorites tab where authenticated users save leagues, teams, and players; tapping any item navigates directly to its full detail screen (league → Standings/Matches/Top Scorers/Top Assists; team → Team Profile; player → Player Profile)
- **Push Notifications:** Delivered via Expo Push Notifications for favorited teams and manually subscribed matches:
  - Lineups confirmed (~1 hour before kickoff, as soon as available)
  - Match starts in 30 minutes (pre-match reminder)
  - Kick-off
  - Goal (with scorer name and running score)
  - Halftime (with score)
  - Full time (with final score)
  - Extra time start
  - Penalty shootout start
  - Red card
  - Penalty awarded (VAR)
  - Match postponed or cancelled
- **Profile screen:** View and edit display name, view email, change password (OTP email verification required — code sent → verify → set new password), log out; accessible via profile icon in the header on all main tabs
- **System theme:** App appearance automatically follows the device's system dark/light mode setting
- **Haptic feedback** throughout all interactive elements
- **Backend TTL cache** reducing redundant API calls and improving perceived speed
- **Graceful error handling** with per-section retry buttons and pull-to-refresh on every screen
- **Cloud deployment:** Backend hosted on Render with auto-deploy on push; frontend distributed via EAS

---

## 2. Process Model and Justification

### 2.1 Selected Model: Agile (Scrum)

This project follows the Agile methodology using the Scrum framework, organized into five sprints (Sprint 0 through Sprint 4), with a post-delivery Sprint 5 adding user accounts, favorites, and push notifications, and a Sprint 6 covering UX polish, security hardening, and notification reliability. Scrum was selected for several reasons that align with the nature of this project:

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
| Sprint 5 | Post-delivery | Supabase auth, favorites, push notifications, profile screen, system theme, cloud deployment |
| Sprint 6 | Post-delivery | OTP password change, password strength validation, name editing, expanded notifications, notification reliability fixes, search UX improvements, persistent sessions |

---

## 3. Gantt Chart

| Phase / Task | Week 1 Mar 23–29 | Week 2 Mar 30–Apr 5 | Week 3 Apr 6–12 | Week 4 Apr 13–19 | Week 5 Apr 20–26 | Post-delivery |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **Sprint 0: Planning & Setup** | █ | | | | | |
| Requirements & analysis | █ | | | | | |
| Architecture & design | █ | | | | | |
| Dev environment setup | █ | | | | | |
| **Sprint 1: Core Features** | | █ | | | | |
| API integration layer + caching | | █ | | | | |
| Standings screen | | █ | | | | |
| Matches screen with filters | | █ | | | | |
| **Sprint 2: Analytics & Polish** | | | █ | | | |
| Team analytics tab (charts, form) | | | █ | | | |
| Dark/light mode | | | █ | | | |
| Error handling & loading states | | | █ | | | |
| **Sprint 3: Deep Navigation** | | | | █ | | |
| League search (name + country) | | | | █ | | |
| Match detail screen (H2H, lineups, stats) | | | | █ | | |
| Team profile + squad | | | | █ | | |
| Player profile + stats | | | | █ | | |
| Top scorers view | | | | █ | | |
| Root stack navigation | | | | █ | | |
| **Sprint 4: Polish & Delivery** | | | | | █ | |
| Haptics throughout app | | | | | █ | |
| Blur UI (tab bar, header cards) | | | | | █ | |
| Live match auto-polling | | | | | █ | |
| Team fixtures browser (full season) | | | | | █ | |
| Team name search | | | | | █ | |
| EAS build configuration | | | | | █ | |
| Backend automated tests | | | | | █ | |
| Documentation & presentation prep | | | | | █ | |
| **Sprint 5: Auth, Favorites & Notifications** | | | | | | █ |
| Supabase auth (email, Google, Apple) | | | | | | █ |
| Profile screen | | | | | | █ |
| System theme (follows device setting) | | | | | | █ |
| Favorites tab (leagues, teams, players) | | | | | | █ |
| Auth gate for unauthenticated users | | | | | | █ |
| Push notifications for live match events | | | | | | █ |
| Backend JWT middleware + Supabase client | | | | | | █ |
| Push token registration endpoint | | | | | | █ |
| APScheduler live event polling | | | | | | █ |
| Render cloud deployment | | | | | | █ |
| **Sprint 6: Security, UX & Notification Reliability** | | | | | | █ |
| OTP email verification for password change | | | | | | █ |
| Password strength validation (8+ chars, letter, number, symbol) | | | | | | █ |
| Profile name editing (persisted to Supabase user metadata) | | | | | | █ |
| Persistent sessions (no biometric gate on open) | | | | | | █ |
| Push token refresh on every app open | | | | | | █ |
| Pre-match lineups notification (fires when lineups drop) | | | | | | █ |
| Pre-match 30-min kickoff reminder | | | | | | █ |
| Extra time / penalty shootout / postponed / cancelled notifications | | | | | | █ |
| Scrollable search results with X dismiss (leagues + teams) | | | | | | █ |
| Actual last-5-match form badges (replaces season-stat estimate) | | | | | | █ |
| Favorites → league detail navigation fix | | | | | | █ |
| Team league auto-discovery (domestic leagues only) | | | | | | █ |

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
| FR-06 | System shall display team form visualization using actual last 5 match results as W/D/L badges | Should Have | Sprint 2 / Sprint 6 | ✅ Done |
| FR-07 | System shall handle API errors gracefully with per-section retry buttons | Must Have | Sprint 2 | ✅ Done |
| FR-08 | System shall follow the device system dark/light mode setting automatically | Should Have | Sprint 2 / Sprint 5 | ✅ Done |
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
| FR-21 | System shall allow users to create an account and sign in via email/password | Must Have | Sprint 5 | ✅ Done |
| FR-22 | System shall support Google OAuth sign-in | Should Have | Sprint 5 | ✅ Done |
| FR-23 | System shall support Apple Sign-In | Should Have | Sprint 5 | ✅ Done |
| FR-24 | System shall persist user sessions across app launches until the user manually logs out | Must Have | Sprint 5 / Sprint 6 | ✅ Done |
| FR-25 | System shall provide a profile screen where users can view and edit their name, view email, change password, and log out | Must Have | Sprint 5 / Sprint 6 | ✅ Done |
| FR-26 | System shall allow authenticated users to favorite leagues, teams, and players | Must Have | Sprint 5 | ✅ Done |
| FR-27 | System shall display a Favorites tab showing all saved items, navigable to their detail screens | Must Have | Sprint 5 | ✅ Done |
| FR-28 | System shall prompt unauthenticated users to log in or sign up when they attempt to favorite an item | Must Have | Sprint 5 | ✅ Done |
| FR-29 | System shall send a push notification when a favorited team's match kicks off | Must Have | Sprint 5 | ✅ Done |
| FR-30 | System shall send a push notification when a goal is scored in a favorited team's match | Must Have | Sprint 5 | ✅ Done |
| FR-31 | System shall send a push notification at halftime of a favorited team's match | Should Have | Sprint 5 | ✅ Done |
| FR-32 | System shall send a push notification at full time of a favorited team's match | Should Have | Sprint 5 | ✅ Done |
| FR-33 | System shall send a push notification when a red card is shown in a favorited team's match | Should Have | Sprint 5 | ✅ Done |
| FR-34 | System shall send a push notification when a penalty is awarded in a favorited team's match | Should Have | Sprint 5 | ✅ Done |
| FR-35 | System shall send a push notification when extra time begins in a favorited team's match | Could Have | Sprint 6 | ✅ Done |
| FR-36 | System shall send a push notification when a penalty shootout begins | Could Have | Sprint 6 | ✅ Done |
| FR-37 | System shall send a push notification when a match is postponed or cancelled | Could Have | Sprint 6 | ✅ Done |
| FR-38 | System shall send a push notification when confirmed lineups are available, before kickoff | Should Have | Sprint 6 | ✅ Done |
| FR-39 | System shall send a push notification approximately 30 minutes before a favorited team's match | Should Have | Sprint 6 | ✅ Done |
| FR-40 | System shall allow users to edit their display name from the profile screen | Should Have | Sprint 6 | ✅ Done |
| FR-41 | System shall require OTP email verification before allowing a password change | Must Have | Sprint 6 | ✅ Done |
| FR-42 | System shall enforce password strength requirements (min 8 characters, at least one letter, one number, one symbol) | Must Have | Sprint 6 | ✅ Done |

### 4.2 Non-Functional Requirements

| ID | Requirement | Category | Status |
|----|-------------|----------|--------|
| NFR-01 | App shall load screen content within 3 seconds on a standard mobile connection | Performance | ✅ Met via TTL cache |
| NFR-02 | App shall function on both iOS and Android via React Native / Expo | Portability | ✅ Met |
| NFR-03 | Codebase shall maintain clear separation between API, business logic, and UI layers | Maintainability | ✅ Met |
| NFR-04 | App shall degrade gracefully when the external API is temporarily unavailable | Reliability | ✅ Met via error states + retry |
| NFR-05 | All API keys and secrets shall be stored in environment variables, never hardcoded | Security | ✅ Met |
| NFR-06 | UI shall follow platform conventions and be navigable without a tutorial | Usability | ✅ Met |
| NFR-07 | Current season shall be computed automatically at server startup without manual updates | Maintainability | ✅ Met |
| NFR-08 | User authentication tokens shall be verified server-side on every protected endpoint | Security | ✅ Met via JWT middleware |
| NFR-09 | User data (favorites, push tokens) shall be isolated per user via row-level security | Security | ✅ Met via Supabase RLS |
| NFR-10 | Backend shall be accessible 24/7 without the developer's machine running | Reliability | ✅ Met via Render deployment |
| NFR-11 | Password change shall require identity verification before the new password is accepted | Security | ✅ Met via OTP email flow |
| NFR-12 | Push token shall be registered or refreshed on every app open while a session is active | Reliability | ✅ Met |

### 4.3 User Stories

| ID | User Story | Acceptance Criteria | Status |
|----|------------|---------------------|--------|
| US-01 | As a soccer fan, I want to view current league standings so I can see how teams are ranked. | Standings display rank, team logo, points, MP, GD. Position zones color-coded. Tapping a team opens team profile. | ✅ Done |
| US-02 | As a user, I want to browse match results and upcoming fixtures so I can review scores and plan watching. | Match list grouped by date, auto-scrolls to next upcoming match. Status filters (All, Today, This Week, Results). | ✅ Done |
| US-03 | As a user, I want to see a team's performance trends over the season. | Sparkline chart shows goals scored/conceded per matchday. Win %, average goals displayed. | ✅ Done |
| US-04 | As a user, I want the app to show helpful error messages when data can't load. | On failure, each section shows "tap to retry" button. Pull-to-refresh available on every screen. | ✅ Done |
| US-05 | As a user, I want to search for any league including by country name. | Typing a country name (e.g. "Spain") returns all leagues from that country alongside name matches. Results are scrollable; an X button clears the query and dismisses the keyboard. | ✅ Done |
| US-06 | As a user, I want to tap a match to see detailed statistics and team information. | Match detail shows score, venue, kickoff time, match stats (possession, shots, corners), H2H history, form badges, and lineups. | ✅ Done |
| US-07 | As a user, I want to see the starting lineup displayed on a pitch diagram. | Formation shown on a green pitch with player names positioned by grid coordinate. Tapping a player opens their profile. | ✅ Done |
| US-08 | As a user, I want to view a team's full profile including their squad and next match. | Team profile shows season stats, next fixture card, last 5 results (tappable), full squad grouped by position. | ✅ Done |
| US-09 | As a user, I want to see all of a team's fixtures for the season in one place. | Season fixtures screen shows all past results and upcoming matches split into two labeled sections, auto-scrolling to upcoming. | ✅ Done |
| US-10 | As a user, I want to search for any team by name across all leagues. | Team search bar returns matching teams with logo and country. Results are scrollable; X button clears query and dismisses keyboard. Tapping navigates to full team profile with stats auto-discovered from the team's domestic league. | ✅ Done |
| US-11 | As a user, I want to view a player's detailed statistics. | Player profile shows photo, age, nationality, height, weight, and per-competition stats (appearances, goals, assists, rating). | ✅ Done |
| US-12 | As a user, I want to create an account so I can save my preferences. | Sign-up screen accepts name, email, and password. Password must be at least 8 characters with at least one letter, number, and symbol. Confirmation email sent. On login, main tabs are shown. | ✅ Done |
| US-13 | As a user, I want to sign in with Google or Apple so I don't need to manage a password. | Google and Apple OAuth buttons appear on login/signup screens. Tapping opens the native auth flow. | ✅ Done |
| US-14 | As a user, I want to stay signed in so I don't need to log in every time I open the app. | Session persists across app launches. User remains authenticated until they explicitly tap Log Out. | ✅ Done |
| US-15 | As a user, I want to favorite a team and receive notifications when they play. | Heart icon on team detail screen; tapping adds to Favorites. Push notifications fire for lineups confirmed, 30-min reminder, kick-off, goals, halftime, FT, extra time, penalties, red cards, and postponement/cancellation. | ✅ Done |
| US-16 | As a user, I want to see all my favorites in one place. | Favorites tab shows saved leagues, teams, and players in sections. Tapping a league opens the full league detail (Standings/Matches/Top Scorers/Top Assists); tapping a team opens the full team profile with stats; tapping a player opens the player profile. | ✅ Done |
| US-17 | As a logged-out user, I want to be prompted to sign in when I try to favorite something. | Tapping the heart icon while logged out shows a bottom sheet with "Log In" and "Sign Up" options. | ✅ Done |
| US-18 | As a user, I want to manage my account from a profile page. | Profile screen shows name (editable), email, change password (OTP verification required), and logout. Name changes persist across sessions. | ✅ Done |
| US-19 | As a user, I want to know when the confirmed lineups are released so I can check the starting XI before kickoff. | Push notification fires as soon as lineups become available in the API, up to ~1 hour before kickoff. | ✅ Done |
| US-20 | As a user, I want a reminder before my team's match starts so I don't miss it. | Push notification sent approximately 30 minutes before kickoff (25–35 min window). | ✅ Done |
| US-21 | As a user, I want to be notified if my team's match is postponed or cancelled. | Push notification sent when the API reports status PST (postponed) or CANC (cancelled) from the daily fixture scan. | ✅ Done |
| US-22 | As a user, I want to change my password securely from the profile screen. | Tapping "Change Password" sends an OTP to the user's registered email. After entering the correct code, the user sets and confirms a new password meeting strength requirements. | ✅ Done |
| US-23 | As a user, I want to update my display name from the profile screen. | Profile screen shows current name with a pencil icon. Tapping opens an inline text field; saving persists the change to Supabase user metadata. | ✅ Done |

---

## 5. High-Level System Architecture

### 5.1 Architecture Overview

GoalBoard uses a four-tier architecture with clear separation of concerns:

1. **Presentation Layer (React Native / Expo SDK 55):** Mobile UI with three primary bottom tabs (Leagues, Teams, Favorites) and a root native stack for screen navigation. Implements system theming, haptic feedback, blur effects, and per-screen pull-to-refresh. Auth state managed via `AuthContext` (Supabase session, push token refreshed on every app open). Favorites state managed via `useFavorites` hook (direct Supabase table access with RLS). Match subscriptions managed via `useMatchSubscription` hook.

2. **Backend API Layer (Python / FastAPI):** Lightweight REST API deployed on Render that proxies requests to API-Football v3, applies TTL-based in-memory caching, transforms response shapes for the mobile client, verifies Supabase JWTs via JWKS on protected endpoints, stores push tokens, and runs two APScheduler background jobs every 60 seconds: `poll_live_events` (live match event notifications) and `poll_upcoming_events` (pre-match lineups, 30-min reminders, postponement/cancellation alerts).

3. **Auth & Data Layer (Supabase):** Provides user authentication (email/password, Google OAuth, Apple Sign-In), persistent session storage, and a PostgreSQL database with two tables (`user_favorites`, `push_tokens`) protected by Row Level Security policies ensuring users can only access their own data.

4. **External Data Layer (API-Football v3):** Third-party REST API providing real-time and historical soccer data including fixtures, standings, lineups, player statistics, and head-to-head records for leagues worldwide.

### 5.2 Screen and Navigation Map

```
Root Stack Navigator
├── Auth Stack (shown when logged out)
│   ├── LoginScreen
│   └── SignupScreen
│
└── Main Stack (shown when logged in)
    ├── MainTabs (Bottom Tab Navigator)
    │   ├── Leagues Tab (LeaguesTab Stack)
    │   │   ├── LeaguesListScreen
    │   │   └── LeagueDetailScreen (Standings / Matches / Top Scorers / Top Assists)
    │   ├── Teams Tab (TeamsTab Stack)
    │   │   └── TeamsScreen (team analytics + search)
    │   └── Favorites Tab (FavoritesTab Stack)
    │       ├── FavoritesScreen (leagues / teams / players sections)
    │       └── LeagueDetailScreen (Standings / Matches / Top Scorers / Top Assists)
    │
    ├── MatchDetail (shared root stack screen)
    ├── TeamDetail (shared root stack screen)
    │   └── → TeamFixtures (full season fixtures)
    ├── PlayerDetail (shared root stack screen)
    └── Profile (accessible via header icon on all main tabs)
```

Any tab can push MatchDetail, TeamDetail, PlayerDetail, or Profile without losing tab state, enabled by the root NativeStackNavigator wrapping the bottom tab navigator. The FavoritesTab registers its own LeagueDetail screen so that tapping a favorited league opens the full standings/matches/scorers view within the Favorites navigation context.

### 5.3 Backend API Endpoints

| Endpoint | Description | Auth Required | Cache TTL |
|----------|-------------|:---:|-----------|
| `GET /api/standings/{league}` | League table — accepts code (`PL`) or numeric ID (`39`) | No | 5 min |
| `GET /api/matches/{league}` | Season fixtures with optional date/status filters | No | 30s–5 min |
| `GET /api/leagues` | Featured league metadata | No | 1 hr |
| `GET /api/leagues/search?q=NAME` | Search leagues by name or country | No | 1 hr |
| `GET /api/h2h/{team1_id}/{team2_id}` | Last 5 head-to-head fixtures | No | 5 min |
| `GET /api/fixtures/{fixture_id}/lineups` | Starting XIs and substitutes for a fixture | No | 10 min |
| `GET /api/teams/search?q=NAME` | Search teams by name globally | No | 5 min |
| `GET /api/teams/{team_id}/next` | Next scheduled fixture for a team | No | 5 min |
| `GET /api/teams/{team_id}/last-fixtures` | Last N fixtures for a team | No | 2 min |
| `GET /api/teams/{team_id}/season-fixtures` | All season fixtures for a team (past + upcoming) | No | 2 min |
| `GET /api/teams/{league}/{id}` | Team detail | No | 10 min |
| `GET /api/squad/{team_id}` | Full squad with positions and ages | No | 10 min |
| `GET /api/players/{player_id}` | Player bio and per-competition statistics | No | 10 min |
| `GET /api/top-scorers/{league}` | Goals leaderboard for a league | No | 5 min |
| `GET /api/top-assists/{league}` | Assists leaderboard for a league | No | 5 min |
| `POST /api/push-token` | Register user's Expo push token | Yes | — |
| `DELETE /api/push-token` | Remove user's Expo push token | Yes | — |
| `GET /api/health` | Health check | No | — |

### 5.4 Key Design Decisions and Tradeoffs

**Backend proxy vs. direct API calls:** All API calls are routed through the Python backend rather than calling API-Football directly from the mobile client. This protects the API key, enables server-side caching, handles data transformation, and allows the frontend to use a single stable interface independent of upstream schema changes.

**React Native with Expo vs. native development:** Expo was chosen to maximize iOS/Android code reuse. The tradeoff is slightly less access to low-level native APIs, which is acceptable for GoalBoard's feature set. EAS (Expo Application Services) was added in Sprint 4 to support proper native development builds with `expo-blur`, `expo-haptics`, and `expo-notifications`.

**Root NativeStack + BottomTabs composition:** Wrapping the bottom tab navigator inside a root native stack enables any tab to push shared screens (MatchDetail, TeamDetail, PlayerDetail, Profile) without duplicating screen registrations or losing tab state. The FavoritesTab additionally registers its own LeagueDetail screen so favorites-to-league navigation remains within the Favorites tab context.

**In-memory TTL cache:** API responses are cached in a Python dictionary with per-endpoint TTL values. Live match endpoints use a 30-second TTL; reference data (squads, lineups) use 10-minute TTLs. This approach eliminates redundant API calls for the most common navigation patterns while keeping data reasonably fresh.

**Dynamic season computation:** `CURRENT_SEASON` is computed at server startup using the current date (July cutoff), eliminating a hardcoded year that would silently break at each season rollover.

**Supabase for auth and favorites storage:** Supabase was chosen over a custom auth implementation because it provides email/password, Google OAuth, Apple Sign-In, and JWT session management out of the box. Favorites are stored directly in Supabase from the frontend via Row Level Security policies, avoiding a custom favorites API. The backend only needs Supabase for push token storage and JWT verification.

**JWKS-based JWT verification:** Supabase migrated to ECC (P-256) asymmetric JWT signing keys. The backend verifies tokens dynamically by fetching the JWKS public key from Supabase's `/.well-known/jwks.json` endpoint using `PyJWKClient`, making verification algorithm-agnostic and future-proof.

**Two APScheduler jobs for notification coverage:** A single live-events job (`poll_live_events`) cannot detect pre-match events (lineups, reminders) or statuses that only appear in the full daily fixture list (PST, CANC). A second job (`poll_upcoming_events`) runs at the same 60-second interval and queries today's complete fixture list, enabling pre-match lineup notifications as soon as the API confirms them, 30-minute kickoff reminders, and postponement/cancellation alerts.

**Push token refresh on every app open:** The initial implementation only registered the Expo push token on `SIGNED_IN` auth events. With permanent sessions, this event never fires on subsequent app opens, leaving the backend with a stale or missing token. The token is now also registered/refreshed when `getSession()` returns an existing session at startup, ensuring the backend always has a valid delivery address.

**OTP-based password change:** Direct `updateUser({ password })` calls allow a password to be changed by anyone with physical access to an unlocked device. The new flow requires the user to first verify their identity via a one-time code sent to their registered email address, then set and confirm a new password that meets strength requirements (8+ characters, letter, number, symbol).

**Permanent sessions until manual logout:** Biometric-gate-on-open was removed in Sprint 6. Supabase sessions are already cryptographically signed and expire on their own schedule. Requiring biometrics on every cold open created UX friction without meaningful security benefit for a sports statistics app, since the session itself cannot be used for sensitive actions without re-authentication (e.g., password change now requires OTP).

**Render for backend deployment:** The FastAPI backend is deployed on Render's free tier, which auto-deploys on every push to the `main` GitHub branch. This removes the dependency on the developer's local machine being on for the app to function.

### 5.5 User Interface Design

The app uses a card-based layout with a consistent visual language across all screens:

- **Leagues tab:** Featured league grid → League detail with four sub-tabs (Standings, Matches, Top Scorers, Top Assists). League search bar supports name and country queries; results are scrollable with a max height; an X button always clears the query and dismisses the keyboard. Profile icon in header navigates to profile.
- **Teams tab:** Global team search bar (scrollable results, always-visible X button) → League filter pills → Team selector with analytics charts, sparklines, and next match card. Recent form badges reflect actual last 5 match results. All elements navigate to full detail screens. Profile icon in header.
- **Favorites tab:** Authenticated users see their saved leagues, teams, and players in labeled sections. Tapping a league navigates to the full LeagueDetail screen. Tapping a team opens the full Team Profile with league stats auto-discovered from the team's domestic league. Unauthenticated users see a prompt to log in or sign up.
- **Auth screens:** Login and signup screens support email/password, Google, and Apple sign-in. Signup enforces password strength (8+ chars, letter, number, symbol).
- **Profile screen:** Accessible via the person icon in the top-right header on all main tabs. Shows editable name (pencil icon → inline text field → save/cancel), email, change password (three-step OTP flow), and logout button.
- **Shared stack screens:** Match detail, Team detail (with favorite heart in header), Player detail (with favorite heart), and Team season fixtures are accessible from anywhere in the navigation tree.
- **AuthGate modal:** A bottom sheet that slides up when a logged-out user taps a favorite heart, offering "Log In" and "Sign Up" options.
- **Theming:** Full dark/light mode follows the device's system setting via `useColorScheme`. Header cards and the tab bar use `expo-blur` for a frosted-glass effect.
- **Haptics:** `expo-haptics` provides selection, light impact, and success notification feedback on all interactive elements.

---

## 6. Quality and Testing Plan

### 6.1 Quality Goals

- **Reliability:** The app should never crash due to unexpected API responses or network failures. Every data-fetching section has an independent error state with a retry button.
- **Data accuracy:** Standings, scores, and statistics must match the source API with no calculation errors in derived values (goal difference, averages, win percentage).
- **Usability:** A new user should be able to find standings, match results, and team trends within 10 seconds of opening the app.
- **Security:** User data must be isolated. No user should be able to read or modify another user's favorites or push tokens. Password changes require identity verification.

### 6.2 Risk Assessment

| Risk | Level | Mitigation |
|------|-------|------------|
| API rate limiting | Medium | Backend caching with TTL-based expiration per endpoint |
| API downtime or schema changes | Low | Per-section error states + retry; cached fallback data |
| Season rollover breaking data | Low | Season year computed dynamically from current date |
| Tight timeline | High | MoSCoW prioritization; "Could Have" features cut first |
| Native build compatibility | Medium | EAS build profiles configured for development, preview, and production |
| Auth token expiry | Low | Supabase auto-refreshes tokens; session persists in AsyncStorage |
| Unauthorized data access | Low | Supabase RLS policies enforce user isolation at the database level |
| Push notification delivery failure | Low | Expo Push API handles delivery; failures silently skipped to avoid crashing the scheduler |
| Stale push token | Low | Token refreshed on every app open via `getSession()` check in AuthContext |
| Apple JWT secret expiry | Medium | Generated Apple client secret JWT expires in 6 months (Oct 2026); requires regeneration |
| Password change without identity verification | Low | Mitigated: OTP email verification required before accepting a new password |

### 6.3 Testing Strategy

**Unit Testing (Backend):** Python unit tests using `pytest` for API service functions, data transformation logic, and cache behavior. 28 tests covering all major service functions including `_parse_fixture`, `get_standings`, `search_leagues`, `get_h2h`, `get_fixture_lineups`, and `get_team_next_fixture`. External API calls are mocked with `unittest.mock.patch`.

**Integration Testing (Backend):** Tests verify that the full data pipeline — from mocked API response through transformation to the format expected by the frontend — produces correct output with no lost fields.

**Manual Testing (Frontend):** Exploratory testing on iOS Simulator and physical device via Expo Dev Client / EAS preview build. Test coverage includes: navigation flows between all screens, pull-to-refresh on every screen, system dark/light mode, search inputs (league search by name and country, team search, scrollable results, X button keyboard dismiss), live match display, empty states, error states, retry behavior, login/signup/logout flow, Google and Apple OAuth, favorites add/remove for leagues/teams/players, Favorites tab rendering and navigation, AuthGate modal for logged-out users, push notification receipt on device (lineups, 30-min reminder, kick-off, goals, halftime, full time), OTP password change flow, profile name editing, and password strength enforcement on signup.

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

- API keys and Supabase service credentials are stored server-side in `.env` files excluded from version control via `.gitignore`. Never embedded in the mobile client.
- All network communication uses HTTPS.
- User input (search queries) is validated server-side with minimum length constraints (`Query(..., min_length=2)`).
- Protected backend endpoints verify Supabase JWTs using the JWKS public key endpoint — no shared secret is stored in the backend.
- Supabase Row Level Security (RLS) policies on `user_favorites` and `push_tokens` ensure users can only read and write their own records, even if a JWT is compromised.
- The frontend Supabase client uses only the anon/public key; the service-role key (which bypasses RLS) is only on the backend.
- Password changes require OTP email verification before the new password is accepted, preventing unauthorized changes from an unattended unlocked device.
- Signup enforces password strength: minimum 8 characters with at least one letter, one number, and one symbol.
- `ITSAppUsesNonExemptEncryption: false` declared in `app.json` for App Store compliance.

---

## 7. Support and Improvement

### 7.1 Maintenance Strategy

Post-delivery maintenance focuses on several areas: monitoring API-Football v3 for breaking changes or endpoint deprecations; updating Expo SDK and npm dependencies quarterly to stay current with security patches; updating the `CURRENT_SEASON` logic if the July cutoff convention changes between soccer seasons; regenerating the Apple client secret JWT before it expires in October 2026; and monitoring Render deployment logs for any backend startup failures after dependency updates.

### 7.2 Potential Future Improvements

- **Expanded statistics** including expected goals (xG), pass maps, and shot locations.
- **Standings history** showing week-by-week position changes as an animated chart.
- **Widgets** (iOS/Android home screen) showing the next match for a followed team.
- **Offline mode** with persistent local storage of the last fetched standings and fixtures.
- **Notification preferences** allowing users to toggle specific event types (e.g. goals only, no red cards).
- **Social features** allowing users to see what teams their friends follow.
- **Android distribution** via Google Play using EAS production build profile.
- **Top Assists leaderboard** display in the Teams tab analytics view.

### 7.3 Lessons Learned

Throughout this project, several key lessons emerged from building a full-stack mobile application as a solo developer:

**API integration complexity:** The API-Football v3 response format required significant transformation before it was useful to the frontend. Building a clean transformation layer in the backend early (Sprint 1) paid dividends throughout — adding new screens in Sprints 3 and 4 required only new endpoints, not changes to how the frontend consumed data.

**Navigation architecture matters early:** Switching from a simple tab navigator to a root-stack-plus-tabs architecture in Sprint 3 (to enable cross-tab deep navigation) required touching many files. Designing the navigation structure before building screens would have reduced this refactoring cost. A secondary example: the Favorites tab required its own LeagueDetail screen registration to enable league navigation within the tab's stack context — a detail that would have been caught earlier with a more deliberate upfront navigation design.

**Iterative polish compounds:** Small quality improvements added incrementally — haptics, blur effects, per-section retry buttons, live polling — each took less than an hour individually but together produced an app that feels significantly more polished than the Sprint 2 baseline.

**Agile adaptability in solo projects:** The Scrum framework worked well for managing scope. Several features originally planned for Sprint 3 (player profiles, team search) were deferred from earlier sprints without disruption because the sprint boundary provided a natural decision point to re-prioritize based on what was actually built and working.

**Auth adds surface area:** Integrating Supabase authentication required coordinating changes across the frontend (AuthContext, session persistence, OAuth flows), backend (JWT verification, protected endpoints), and infrastructure (Supabase project, Google Cloud Console, Apple Developer Portal). Each of these systems has its own configuration quirks — for example, Supabase migrated to ECC (P-256) asymmetric JWT keys, which required switching from a shared-secret HS256 approach to JWKS-based verification. Planning for this coordination overhead earlier would have smoothed the Sprint 5 implementation.

**Push notification reliability requires end-to-end thinking:** The notification system involves four independent components — the frontend token registration, the Supabase push_tokens table, the backend scheduler, and the Expo Push API. A bug in any one component silently kills delivery. The initial implementation had two subtle failures: the push token was only registered on `SIGNED_IN` events (missing all subsequent app opens with a persisted session), and lineups notifications only fired when a match went live (missing the actual moment lineups dropped ~1 hour before kickoff). Both required tracing the full delivery path to diagnose.

**Cloud deployment removes a critical dependency:** Deploying the backend to Render meant the app continued working even when the development machine was off. This is essential for real user testing and for push notification delivery, which requires the backend to be always-on to poll live match events.

**Security is incremental:** The initial password change implementation allowed any user with access to an unlocked phone to silently update the account password. Adding OTP verification and password strength requirements in Sprint 6 closed this gap with minimal UI disruption — the three-step flow is clear to users and matches patterns they already recognize from other apps.
