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

Soccer fans who follow multiple leagues often struggle to get a consolidated, clean view of standings, match results, and team performance trends. Existing apps are bloated with ads, social features, and betting integrations that distract from the core data. There is a need for a focused, lightweight mobile application that presents soccer statistics clearly and allows fans to quickly analyze team performance over a season.

### 1.2 Project Overview

GoalBoard is a mobile application built with React Native (Expo) on the frontend and Python (FastAPI) on the backend. It connects to the Soccerdata REST API to fetch real-time and historical soccer data. The app provides three core capabilities: browsing league standings, viewing match results with filtering, and visualizing team performance trends through interactive charts.

The application demonstrates a complete software engineering lifecycle including requirements analysis, architectural design, iterative implementation, quality assurance, and considerations for deployment and long-term maintenance.

### 1.3 Target Users

The primary users are casual-to-dedicated soccer fans who want quick access to league data without the clutter of mainstream sports apps. Secondary users include fantasy soccer players and amateur analysts who want to spot form trends.

### 1.4 Key Features

- League standings with full table (rank, points, W/D/L, goal difference)
- Match results browsable by matchday or date range with input validation
- Team performance trend charts (goals scored/conceded over the season)
- Graceful error handling and local caching for offline resilience
- Clean, ad-free mobile experience optimized for iOS and Android

---

## 2. Process Model and Justification

### 2.1 Selected Model: Agile (Scrum)

This project follows the Agile methodology using the Scrum framework, organized into four one-week sprints (Sprint 0 through Sprint 3). Scrum was selected for several reasons that align with the nature of this project:

**Iterative delivery:** With only 5 weeks available, the project benefits from delivering working increments each week rather than attempting a single waterfall delivery. Each sprint produces a demonstrable, testable feature set.

**Adaptability:** As a solo developer integrating with an external API, unexpected issues (rate limits, data format changes, missing fields) are likely. Scrum's sprint retrospective model allows the plan to adapt each week based on what was learned.

**Solo Scrum adaptation:** While Scrum is typically team-based, the core principles (sprint planning, daily progress checks, sprint review, retrospective) translate well to individual work. The student acts as both Product Owner and Developer, with the instructor serving as the stakeholder.

**Risk front-loading:** Sprint 0 handles all planning and environment setup, and Sprint 1 tackles the riskiest element (API integration) first. This ensures that if problems arise, there is time to adapt.

### 2.2 Sprint Structure

| Sprint | Weeks | Focus |
|--------|-------|-------|
| Sprint 0 | Week 1 | Planning, requirements, design, environment setup |
| Sprint 1 | Weeks 2–3 | API integration, standings screen, match results screen, caching |
| Sprint 2 | Week 4 | Charts, UI polish, error handling, edge cases |
| Sprint 3 | Week 5 | Testing, bug fixes, documentation, presentation prep |

---

## 3. Gantt Chart

| Phase / Task | Week 1 Mar 23–29 | Week 2 Mar 30–Apr 5 | Week 3 Apr 6–12 | Week 4 Apr 13–19 | Week 5 Apr 20–26 |
|---|:---:|:---:|:---:|:---:|:---:|
| **Sprint 0: Planning & Setup** | █ | | | | |
| Requirements & analysis | █ | | | | |
| Architecture & design | █ | | | | |
| Dev environment setup | █ | | | | |
| **Sprint 1: Core Features** | | █ | █ | | |
| API integration layer | | █ | | | |
| Standings screen | | █ | | | |
| Match results screen | | █ | █ | | |
| Data validation logic | | | █ | | |
| **Sprint 2: Visualization & Polish** | | | | █ | |
| Charts & trend graphs | | | | █ | |
| UI polish & navigation | | | | █ | |
| Error handling & edge cases | | | | █ | |
| **Sprint 3: Testing & Delivery** | | | | | █ |
| Unit & integration testing | | | | | █ |
| Bug fixes & refinement | | | | | █ |
| Final presentation prep | | | | | █ |

---

## 4. Requirements and Analysis

### 4.1 Functional Requirements

| ID | Requirement | Priority | Sprint |
|----|-------------|----------|--------|
| FR-01 | System shall fetch and display current league standings from Football-Data.org API | Must Have | Sprint 1 |
| FR-02 | System shall display match results filtered by matchday or date range | Must Have | Sprint 1 |
| FR-03 | System shall validate all user inputs (date ranges, search filters) before processing | Must Have | Sprint 1 |
| FR-04 | System shall display team detail view with season statistics | Should Have | Sprint 1 |
| FR-05 | System shall generate line charts showing goals scored/conceded trends over a season | Must Have | Sprint 2 |
| FR-06 | System shall display team form visualization (last 5 match results) | Should Have | Sprint 2 |
| FR-07 | System shall handle API errors gracefully with user-friendly messages | Must Have | Sprint 2 |
| FR-08 | System shall allow users to select between multiple leagues (EPL, La Liga, etc.) | Could Have | Sprint 2 |
| FR-09 | System shall cache API responses locally to reduce redundant network calls | Should Have | Sprint 1 |
| FR-10 | System shall display a loading state while data is being fetched | Must Have | Sprint 1 |

### 4.2 Non-Functional Requirements

| ID | Requirement | Category |
|----|-------------|----------|
| NFR-01 | App shall load screen content within 3 seconds on a standard mobile connection | Performance |
| NFR-02 | App shall function on both iOS and Android via React Native / Expo | Portability |
| NFR-03 | Codebase shall maintain clear separation between API, business logic, and UI layers | Maintainability |
| NFR-04 | App shall remain usable when the external API is temporarily unavailable (cached data) | Reliability |
| NFR-05 | All API keys shall be stored in environment variables, never hardcoded | Security |
| NFR-06 | UI shall follow platform conventions and be navigable without a tutorial | Usability |

### 4.3 User Stories

| ID | User Story | Acceptance Criteria |
|----|------------|---------------------|
| US-01 | As a soccer fan, I want to view current league standings so I can see how teams are ranked. | Standings display rank, team, points, wins, draws, losses, GD. Data refreshes on pull-to-refresh. |
| US-02 | As a user, I want to browse match results by matchday so I can review recent scores. | Match list shows date, home team, score, away team. Filterable by matchday number. |
| US-03 | As a user, I want to see a team's goals trend over the season so I can evaluate their form. | Line chart shows goals scored and conceded per matchday. Chart updates when a team is selected. |
| US-04 | As a user, I want the app to show helpful error messages when data can't load. | On API failure, a message explains the issue and offers a retry button. |
| US-05 | As a user, I want to filter results by date range so I can look at a specific period. | Date picker validates that start ≤ end. Invalid ranges show inline error. Results update on apply. |
| US-06 | As a user, I want to tap a team to see their detailed stats for the season. | Detail screen shows matches played, goals for/against, clean sheets, and form (last 5 results). |

---

## 5. High-Level System Architecture

### 5.1 Architecture Overview

GoalBoard uses a three-tier architecture with clear separation of concerns:

1. **Presentation Layer (React Native / Expo):** Mobile UI screens for standings, matches, and charts. Handles navigation, user input, and display logic.

2. **Backend API Layer (Python / FastAPI):** Lightweight REST API that proxies requests to Football-Data.org, adds caching, handles validation, and formats data for the mobile client.

3. **External Data Layer (Football-Data.org API):** Third-party REST API providing real-time and historical soccer data for major leagues worldwide.

### 5.2 Key Design Decisions and Tradeoffs

**Backend proxy vs. direct API calls:** The app routes all API calls through a Python backend rather than calling the Soccerdata API directly from the mobile client. This adds a server component but provides caching, rate-limit management, data transformation, and keeps the API key off the client device.

**React Native with Expo vs. native development:** Expo was chosen over native Swift/Kotlin to maximize code reuse across iOS and Android with a single JavaScript codebase. The tradeoff is slightly less access to native APIs, but GoalBoard's feature set does not require low-level device access.

**Local caching strategy:** The backend caches API responses with a configurable TTL (time-to-live). This reduces Soccerdata API usage and improves perceived app speed. The tradeoff is that data may be slightly stale, which is acceptable for match data that updates infrequently.

**Chart library selection:** `react-native-chart-kit` was selected for trend visualizations due to its simplicity and Expo compatibility. More powerful libraries like Victory Native exist but add complexity that is not justified for this scope.

### 5.3 User Interface Design Concepts

The app uses a bottom tab navigation pattern with three primary tabs:

- **Standings Tab:** Displays a sortable league table. Tapping a team navigates to a detail screen.
- **Matches Tab:** Lists recent and upcoming matches with a date/matchday filter bar at the top.
- **Trends Tab:** Shows team performance charts. Users select a team from a dropdown to view goals scored/conceded over time.

The visual design follows a clean, card-based layout with team colors as accent highlights. Loading states use skeleton placeholders, and error states provide clear messaging with retry actions.

---

## 6. Quality and Testing Plan

### 6.1 Quality Goals

- **Reliability:** The app should never crash due to unexpected API responses or network failures.
- **Data accuracy:** Standings and scores must match the source API; no calculation errors in derived statistics.
- **Usability:** A new user should be able to find standings, match results, and trends within 10 seconds of opening the app.

### 6.2 Risk Assessment

| Risk | Level | Mitigation |
|------|-------|------------|
| API rate limiting | Medium | Backend caching with TTL-based expiration |
| API downtime or schema changes | Low | Error handling and cached fallback data |
| Tight timeline | High | MoSCoW prioritization; "Could Have" features are cut first if time is short |

### 6.3 Testing Strategy

**Unit Testing (Backend):** Python unit tests using pytest for API service functions, data transformation logic, and input validation. Mock external API calls with `unittest.mock` to test error handling paths.

**Component Testing (Frontend):** React Native component tests using Jest and React Native Testing Library. Test that screens render correctly with mock data, that loading and error states display properly, and that user interactions trigger expected behavior.

**Integration Testing:** End-to-end tests verifying that the mobile client correctly fetches, displays, and filters data from the backend API. Test the full data flow from API call to screen rendering.

**Manual Testing:** Exploratory testing on both iOS simulator and Android emulator to verify UI consistency, navigation flow, and edge cases (empty states, very long team names, etc.).

### 6.4 Security Considerations

- API key is stored server-side in environment variables, never embedded in the mobile client.
- All network communication uses HTTPS.
- User input (date ranges, filters) is validated on both client and server to prevent injection or malformed requests.
- No user authentication is required (read-only public data), which minimizes the attack surface.

---

## 7. Support and Improvement

### 7.1 Maintenance Strategy

Post-delivery maintenance focuses on three areas: monitoring the Football-Data.org API for breaking changes or deprecations, updating Expo SDK and dependencies quarterly to stay current with security patches, and maintaining the backend cache configuration as league schedules change between seasons.

### 7.2 Potential Improvements

- Add push notifications for live match score updates.
- Support additional leagues beyond the initial set.
- Implement user accounts with favorite teams and personalized dashboards.
- Add player-level statistics and comparison tools.
- Introduce dark mode and accessibility improvements.

### 7.3 Lessons Learned

*This section will be completed after project delivery. It will reflect on what went well, what challenges were encountered, how the Agile process worked for a solo project, and what the student would do differently in a future project.*
