# Match Detail Tabs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single-scroll MatchDetailScreen with a three-tab swipeable layout (Details · Stats · Lineups) and add a match events timeline and full fixture statistics fetched from two new backend endpoints.

**Architecture:** `MatchDetailScreen` splits into a pinned match header plus a `TabView` (from `react-native-tab-view`) that fills the remaining space. Each tab is its own `ScrollView` so vertical and horizontal scroll axes never conflict. Two new backend endpoints (`/fixtures/{id}/statistics` and `/fixtures/{id}/events`) feed the Stats and Events sections; Stats are fetched lazily on first tab visit and both poll every 60s on live matches.

**Tech Stack:** React Native 0.83 / Expo SDK 55, `react-native-tab-view` (pure JS, works in Expo Go), FastAPI backend, API-Football v3.

---

## File Map

| File | Action |
|---|---|
| `backend/services/football_api.py` | Add `STAT_KEYS`, `_parse_stat_value`, `get_fixture_statistics`, `get_fixture_events` |
| `backend/tests/test_football_api.py` | Add 4 new tests (TDD) |
| `backend/routers/fixtures.py` | Add two new endpoints |
| `frontend/package.json` | `react-native-tab-view` + `react-native-pager-view` added via expo install |
| `frontend/src/screens/MatchDetailScreen.js` | Full restructure — tabs, EventRow component, STAT_LABELS, new state/fetch hooks |

---

## Task 1: Backend — `get_fixture_statistics`

**Files:**
- Modify: `backend/services/football_api.py`
- Test: `backend/tests/test_football_api.py`

- [ ] **Step 1: Write the failing tests**

Open `backend/tests/test_football_api.py`. Add at the bottom:

```python
def test_get_fixture_statistics_returns_two_teams():
    sample = {
        "response": [
            {
                "team": {"id": 33, "name": "Man Utd", "logo": "https://logo.png"},
                "statistics": [
                    {"type": "Shots on Goal", "value": 4},
                    {"type": "Ball Possession", "value": "52%"},
                    {"type": "Yellow Cards", "value": 2},
                    {"type": "Passes %", "value": "89%"},
                    {"type": "Ignored Stat", "value": 99},
                ],
            },
            {
                "team": {"id": 40, "name": "Liverpool", "logo": "https://logo2.png"},
                "statistics": [
                    {"type": "Shots on Goal", "value": 7},
                    {"type": "Ball Possession", "value": "48%"},
                    {"type": "Yellow Cards", "value": None},
                ],
            },
        ]
    }
    with patch("services.football_api.httpx.Client") as mock_client_cls:
        mock_client = mock_client_cls.return_value.__enter__.return_value
        mock_client.get.return_value = mock_response(sample)
        result = football_api.get_fixture_statistics(1234)

    assert len(result) == 2
    assert result[0]["team_id"] == 33
    assert result[0]["stats"]["Shots on Goal"] == 4
    assert result[0]["stats"]["Ball Possession"] == 52   # "52%" → 52
    assert result[0]["stats"]["Passes %"] == 89          # "89%" → 89
    assert "Ignored Stat" not in result[0]["stats"]      # not in STAT_KEYS
    assert result[1]["stats"]["Yellow Cards"] == 0        # None → 0


def test_get_fixture_statistics_handles_empty():
    sample = {"response": []}
    with patch("services.football_api.httpx.Client") as mock_client_cls:
        mock_client = mock_client_cls.return_value.__enter__.return_value
        mock_client.get.return_value = mock_response(sample)
        result = football_api.get_fixture_statistics(9999)
    assert result == []
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend && source venv/bin/activate
pytest tests/test_football_api.py::test_get_fixture_statistics_returns_two_teams tests/test_football_api.py::test_get_fixture_statistics_handles_empty -v
```

Expected: `FAILED` with `AttributeError: module ... has no attribute 'get_fixture_statistics'`

- [ ] **Step 3: Implement `get_fixture_statistics` in `football_api.py`**

Add after the `get_fixture_lineups` function (around line 304), before `get_top_scorers`:

```python
STAT_KEYS = {
    "Shots on Goal",
    "Shots off Goal",
    "Total Shots",
    "Blocked Shots",
    "Shots insidebox",
    "Shots outsidebox",
    "Fouls",
    "Corner Kicks",
    "Offsides",
    "Ball Possession",
    "Yellow Cards",
    "Red Cards",
    "Goalkeeper Saves",
    "Passes accurate",
    "Passes %",
}


def _parse_stat_value(val) -> int:
    if val is None:
        return 0
    if isinstance(val, str):
        try:
            return int(val.replace("%", "").strip())
        except ValueError:
            return 0
    try:
        return int(val)
    except (TypeError, ValueError):
        return 0


def get_fixture_statistics(fixture_id: int) -> list:
    raw = _get("/fixtures/statistics", params={"fixture": fixture_id}, ttl=30)
    result = []
    for team_data in raw.get("response", []):
        team = team_data.get("team", {})
        stats = {}
        for s in team_data.get("statistics", []):
            stat_type = s.get("type", "")
            if stat_type in STAT_KEYS:
                stats[stat_type] = _parse_stat_value(s.get("value"))
        result.append({
            "team_id":   team.get("id"),
            "team_name": team.get("name"),
            "team_logo": team.get("logo"),
            "stats":     stats,
        })
    return result
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pytest tests/test_football_api.py::test_get_fixture_statistics_returns_two_teams tests/test_football_api.py::test_get_fixture_statistics_handles_empty -v
```

Expected: both `PASSED`

- [ ] **Step 5: Commit**

```bash
git add backend/services/football_api.py backend/tests/test_football_api.py
git commit -m "feat(backend): add get_fixture_statistics with full stat parsing"
```

---

## Task 2: Backend — `get_fixture_events`

**Files:**
- Modify: `backend/services/football_api.py`
- Test: `backend/tests/test_football_api.py`

- [ ] **Step 1: Write the failing tests**

Append to `backend/tests/test_football_api.py`:

```python
def test_get_fixture_events_returns_sorted_events():
    sample = {
        "response": [
            {
                "time": {"elapsed": 67, "extra": None},
                "team": {"id": 40, "name": "Liverpool", "logo": "https://logo.png"},
                "player": {"id": 111, "name": "Salah"},
                "assist": {"id": None, "name": None},
                "type": "Card",
                "detail": "Yellow Card",
            },
            {
                "time": {"elapsed": 23, "extra": None},
                "team": {"id": 33, "name": "Man Utd", "logo": "https://logo2.png"},
                "player": {"id": 222, "name": "Rashford"},
                "assist": {"id": 333, "name": "Bruno"},
                "type": "Goal",
                "detail": "Normal Goal",
            },
            {
                "time": {"elapsed": 45, "extra": 2},
                "team": {"id": 33, "name": "Man Utd", "logo": "https://logo2.png"},
                "player": {"id": 444, "name": "Maguire"},
                "assist": {"id": None, "name": None},
                "type": "subst",
                "detail": "Substitution 1",
            },
        ]
    }
    with patch("services.football_api.httpx.Client") as mock_client_cls:
        mock_client = mock_client_cls.return_value.__enter__.return_value
        mock_client.get.return_value = mock_response(sample)
        result = football_api.get_fixture_events(1234)

    # Should be sorted by minute ascending
    assert len(result) == 3
    assert result[0]["minute"] == 23
    assert result[0]["type"] == "Goal"
    assert result[0]["player_name"] == "Rashford"
    assert result[0]["assist_name"] == "Bruno"
    assert result[1]["minute"] == 45
    assert result[1]["extra_minute"] == 2
    assert result[2]["minute"] == 67
    assert result[2]["type"] == "Card"
    assert result[2]["assist_name"] is None


def test_get_fixture_events_handles_empty():
    sample = {"response": []}
    with patch("services.football_api.httpx.Client") as mock_client_cls:
        mock_client = mock_client_cls.return_value.__enter__.return_value
        mock_client.get.return_value = mock_response(sample)
        result = football_api.get_fixture_events(9999)
    assert result == []
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pytest tests/test_football_api.py::test_get_fixture_events_returns_sorted_events tests/test_football_api.py::test_get_fixture_events_handles_empty -v
```

Expected: `FAILED` with `AttributeError: module ... has no attribute 'get_fixture_events'`

- [ ] **Step 3: Implement `get_fixture_events` in `football_api.py`**

Add immediately after `get_fixture_statistics`:

```python
def get_fixture_events(fixture_id: int) -> list:
    raw = _get("/fixtures/events", params={"fixture": fixture_id}, ttl=30)
    events = []
    for e in raw.get("response", []):
        time   = e.get("time", {})
        team   = e.get("team", {})
        player = e.get("player", {})
        assist = e.get("assist", {})
        events.append({
            "minute":       time.get("elapsed"),
            "extra_minute": time.get("extra"),
            "team_id":      team.get("id"),
            "team_name":    team.get("name"),
            "team_logo":    team.get("logo"),
            "player_name":  player.get("name"),
            "assist_name":  assist.get("name") or None,
            "type":         e.get("type"),
            "detail":       e.get("detail"),
        })
    return sorted(
        events,
        key=lambda ev: (ev.get("minute") or 0, ev.get("extra_minute") or 0),
    )
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pytest tests/test_football_api.py::test_get_fixture_events_returns_sorted_events tests/test_football_api.py::test_get_fixture_events_handles_empty -v
```

Expected: both `PASSED`

- [ ] **Step 5: Run full test suite to confirm nothing is broken**

```bash
pytest tests/ -v
```

Expected: all tests pass (28 + 4 new = 32 passing)

- [ ] **Step 6: Commit**

```bash
git add backend/services/football_api.py backend/tests/test_football_api.py
git commit -m "feat(backend): add get_fixture_events sorted by minute"
```

---

## Task 3: Backend — New Endpoints in Fixtures Router

**Files:**
- Modify: `backend/routers/fixtures.py`

- [ ] **Step 1: Add imports and two endpoints**

Open `backend/routers/fixtures.py`. Replace its entire contents with:

```python
from fastapi import APIRouter, HTTPException
from services.football_api import (
    get_h2h,
    get_fixture_lineups,
    get_fixture_statistics,
    get_fixture_events,
)

router = APIRouter()


@router.get("/h2h/{team1_id}/{team2_id}")
def head_to_head(team1_id: int, team2_id: int):
    """Return last 5 head-to-head fixtures between two teams."""
    try:
        return get_h2h(team1_id, team2_id)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.get("/fixtures/{fixture_id}/lineups")
def fixture_lineups(fixture_id: int):
    """Return starting XIs for a fixture."""
    try:
        return get_fixture_lineups(fixture_id)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.get("/fixtures/{fixture_id}/statistics")
def fixture_statistics(fixture_id: int):
    """Return full match statistics for a fixture (both teams)."""
    try:
        return get_fixture_statistics(fixture_id)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.get("/fixtures/{fixture_id}/events")
def fixture_events(fixture_id: int):
    """Return match events (goals, cards, substitutions) sorted by minute."""
    try:
        return get_fixture_events(fixture_id)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))
```

- [ ] **Step 2: Run full test suite**

```bash
pytest tests/ -v
```

Expected: all 32 tests pass

- [ ] **Step 3: Verify endpoints respond (backend must be running)**

```bash
curl -s http://localhost:8000/api/fixtures/1035686/statistics | python3 -m json.tool | head -30
curl -s http://localhost:8000/api/fixtures/1035686/events | python3 -m json.tool | head -30
```

Replace `1035686` with any fixture ID you know exists. Expected: JSON array (may be empty for old/future fixtures).

- [ ] **Step 4: Commit**

```bash
git add backend/routers/fixtures.py
git commit -m "feat(backend): expose /fixtures/{id}/statistics and /fixtures/{id}/events endpoints"
```

---

## Task 4: Frontend — Install react-native-tab-view

**Files:**
- Modify: `frontend/package.json` (via expo install)

- [ ] **Step 1: Install the packages**

```bash
cd frontend
npx expo install react-native-tab-view react-native-pager-view
```

`expo install` pins compatible versions for Expo SDK 55. `react-native-pager-view` is the native swipe engine; `react-native-tab-view` is the tab management layer on top.

- [ ] **Step 2: Verify package.json updated**

```bash
grep -E "tab-view|pager-view" package.json
```

Expected output (versions may differ slightly):
```
"react-native-pager-view": "6.x.x",
"react-native-tab-view": "^3.x.x",
```

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "feat(frontend): add react-native-tab-view and react-native-pager-view"
```

---

## Task 5: Frontend — Scaffold TabView + Add Constants and New State

This task restructures `MatchDetailScreen.js` to use the new tab layout. After this task the screen renders three swipeable tabs with placeholder content (filled in Tasks 6–8).

**Files:**
- Modify: `frontend/src/screens/MatchDetailScreen.js`

- [ ] **Step 1: Update imports at the top of `MatchDetailScreen.js`**

Replace the first two lines:

```javascript
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, Image, ScrollView, StyleSheet, ActivityIndicator, RefreshControl,
  TouchableOpacity,
} from 'react-native';
```

With:

```javascript
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, Image, ScrollView, StyleSheet, ActivityIndicator, RefreshControl,
  TouchableOpacity, useWindowDimensions,
} from 'react-native';
import { TabView } from 'react-native-tab-view';
```

- [ ] **Step 2: Add `ROUTES` constant and `STAT_LABELS` constant just above the `formatDateTime` function**

```javascript
const ROUTES = [
  { key: 'details', title: 'DETAILS' },
  { key: 'stats',   title: 'STATS'   },
  { key: 'lineups', title: 'LINEUPS' },
];

const STAT_LABELS = [
  'Shots on Goal',
  'Shots off Goal',
  'Total Shots',
  'Blocked Shots',
  'Shots insidebox',
  'Shots outsidebox',
  'Fouls',
  'Corner Kicks',
  'Offsides',
  'Ball Possession',
  'Yellow Cards',
  'Red Cards',
  'Goalkeeper Saves',
  'Passes accurate',
  'Passes %',
];
```

- [ ] **Step 3: Add `EventRow` component just above the `export default function MatchDetailScreen` line**

```javascript
function EventRow({ event, colors, isDark, isLast }) {
  const { type, detail } = event;
  let icon;
  if (type === 'Goal')       icon = detail === 'Own Goal' ? '🔴⚽' : '⚽';
  else if (type === 'Card')  icon = detail === 'Yellow Card' ? '🟨' : '🟥';
  else if (type === 'subst') icon = '↕';
  else                       return null;

  const minuteStr = event.extra_minute
    ? `${event.minute}+${event.extra_minute}'`
    : `${event.minute ?? '?'}'`;

  return (
    <View style={[
      s.eventRow,
      { borderBottomColor: colors.border, borderBottomWidth: isLast ? 0 : 1 },
    ]}>
      <Text style={[s.eventMinute, { color: colors.mutedForeground }]}>{minuteStr}</Text>
      <Text style={s.eventIcon}>{icon}</Text>
      <View style={s.eventInfo}>
        <Text style={[s.eventPlayer, { color: colors.foreground }]} numberOfLines={1}>
          {event.player_name}
        </Text>
        {(type === 'Goal' || type === 'subst') && event.assist_name ? (
          <Text style={[s.eventAssist, { color: colors.mutedForeground }]} numberOfLines={1}>
            {type === 'Goal' ? '↳' : '↓'} {event.assist_name}
          </Text>
        ) : null}
      </View>
      {event.team_logo ? (
        <View style={[s.eventLogoWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
          <Image source={{ uri: event.team_logo }} style={s.eventTeamLogo} />
        </View>
      ) : null}
    </View>
  );
}
```

- [ ] **Step 4: Inside `MatchDetailScreen`, add new state and `useWindowDimensions` just after the existing state declarations**

Existing state block ends at roughly line 117 (`const [errors, setErrors] = useState(...)`). Add immediately after it:

```javascript
const layout = useWindowDimensions();
const [activeTab,   setActiveTab]   = useState(0);
const [events,      setEvents]      = useState([]);
const [matchStats,  setMatchStats]  = useState(null);
const statsFetched = useRef(false);
```

Also extend the existing `loading` and `errors` state initializers to include the two new keys:

```javascript
const [loading, setLoading] = useState({
  standings: true, h2h: true, form: true, lineups: true,
  events: true, stats: false,
});
const [errors, setErrors] = useState({
  standings: false, h2h: false, form: false, lineups: false,
  events: false, stats: false,
});
```

- [ ] **Step 5: Add `fetchEvents` and `fetchStats` callbacks after `fetchLineups`**

```javascript
const fetchEvents = useCallback(() => {
  setLoading(p => ({ ...p, events: true }));
  setErrors(p => ({ ...p, events: false }));
  api.get(`/api/fixtures/${fixtureId}/events`)
    .then(r => setEvents(Array.isArray(r.data) ? r.data : []))
    .catch(() => { setEvents([]); setErrors(p => ({ ...p, events: true })); })
    .finally(() => setLoading(p => ({ ...p, events: false })));
}, [fixtureId]);

const fetchStats = useCallback(() => {
  setLoading(p => ({ ...p, stats: true }));
  setErrors(p => ({ ...p, stats: false }));
  api.get(`/api/fixtures/${fixtureId}/statistics`)
    .then(r => setMatchStats(Array.isArray(r.data) && r.data.length > 0 ? r.data : null))
    .catch(() => { setMatchStats(null); setErrors(p => ({ ...p, stats: true })); })
    .finally(() => setLoading(p => ({ ...p, stats: false })));
}, [fixtureId]);
```

- [ ] **Step 6: Update `fetchAll` to include `fetchEvents` and add `handleTabChange`**

Replace the existing `fetchAll`:

```javascript
const fetchAll = useCallback(() => {
  fetchStandings();
  fetchH2h();
  fetchForm();
  fetchLineups();
  fetchEvents();
}, [fetchStandings, fetchH2h, fetchForm, fetchLineups, fetchEvents]);
```

Add `handleTabChange` immediately after `fetchAll`:

```javascript
const handleTabChange = useCallback((index) => {
  setActiveTab(index);
  if (index === 1 && !statsFetched.current) {
    statsFetched.current = true;
    fetchStats();
  }
}, [fetchStats]);
```

- [ ] **Step 7: Wrap `navigateToTeam` in `useCallback`**

Replace the existing `navigateToTeam` arrow function with:

```javascript
const navigateToTeam = useCallback((teamObj, standingsRow) => {
  hapticSelect();
  const team = standingsRow ?? {
    team_id:   teamObj.id,
    team_name: teamObj.name,
    team_logo: teamObj.logo,
  };
  navigation.push('TeamDetail', { team, leagueCode, leagueLabel });
}, [navigation, leagueCode, leagueLabel]);
```

- [ ] **Step 8: Add live polling useEffect after the existing `useEffect(() => { fetchAll(); }, [fetchAll]);`**

```javascript
useEffect(() => {
  if (!isLive) return;
  const id = setInterval(() => {
    fetchEvents();
    if (statsFetched.current) fetchStats();
  }, 60_000);
  return () => clearInterval(id);
}, [isLive, fetchEvents, fetchStats]);
```

- [ ] **Step 9: Add `renderScene` callback before the `return` statement**

This temporarily returns placeholder views for each tab (filled in Tasks 6–8):

```javascript
const renderScene = useCallback(({ route }) => {
  if (route.key === 'details') {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }
  if (route.key === 'stats') {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }
  if (route.key === 'lineups') {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }
  return null;
}, [colors.background]);
```

- [ ] **Step 10: Replace the entire `return` statement of `MatchDetailScreen`**

Delete everything from `return (` to the closing `);` and replace with:

```javascript
  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>

      {/* Pinned Match Header */}
      <BlurView
        tint={isDark ? 'systemThinMaterialDark' : 'systemThinMaterialLight'}
        intensity={60}
        style={[s.headerCard, { borderColor: colors.border, overflow: 'hidden' }]}
      >
        <View style={s.teamsRow}>
          <TouchableOpacity
            style={s.teamCol}
            activeOpacity={0.7}
            onPress={() => match.teams?.home && navigateToTeam(match.teams.home, standings.find(r => r.team_id === homeId))}
          >
            <View style={[s.teamLogoWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
              {match.teams?.home?.logo
                ? <Image source={{ uri: match.teams.home.logo }} style={s.teamLogo} />
                : <Text style={s.emoji}>⚽</Text>}
            </View>
            <Text style={[s.teamName, { color: colors.foreground }]} numberOfLines={2}>
              {match.teams?.home?.name}
            </Text>
          </TouchableOpacity>

          <View style={s.middleCol}>
            {isFinished || isLive ? (
              <Text style={[s.scoreText, { color: isLive ? colors.accent : colors.foreground }]}>
                {match.score?.home ?? '–'} – {match.score?.away ?? '–'}
              </Text>
            ) : (
              <Text style={[s.vsText, { color: colors.mutedForeground }]}>VS</Text>
            )}
            {isLive && (
              <Text style={[s.liveLabel, { color: colors.destructive }]}>
                LIVE {match.minute ? `${match.minute}'` : ''}
              </Text>
            )}
          </View>

          <TouchableOpacity
            style={[s.teamCol, s.teamColRight]}
            activeOpacity={0.7}
            onPress={() => match.teams?.away && navigateToTeam(match.teams.away, standings.find(r => r.team_id === awayId))}
          >
            <View style={[s.teamLogoWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
              {match.teams?.away?.logo
                ? <Image source={{ uri: match.teams.away.logo }} style={s.teamLogo} />
                : <Text style={s.emoji}>⚽</Text>}
            </View>
            <Text style={[s.teamName, { color: colors.foreground }]} numberOfLines={2}>
              {match.teams?.away?.name}
            </Text>
          </TouchableOpacity>
        </View>

        {match.venue?.name ? (
          <Text style={[s.venue, { color: colors.mutedForeground }]}>
            {match.venue.name}{match.venue.city ? `, ${match.venue.city}` : ''}
          </Text>
        ) : null}
        {match.date ? (
          <Text style={[s.kickoff, { color: colors.mutedForeground }]}>
            {formatDateTime(match.date)}
          </Text>
        ) : null}
      </BlurView>

      {/* Custom Tab Bar */}
      <View style={[s.tabBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {ROUTES.map((route, i) => (
          <TouchableOpacity
            key={route.key}
            style={[s.tabBtn, activeTab === i && { backgroundColor: colors.accent }]}
            onPress={() => { hapticSelect(); handleTabChange(i); }}
            activeOpacity={0.8}
          >
            <Text style={[s.tabBtnText, { color: activeTab === i ? '#fff' : colors.mutedForeground }]}>
              {route.title}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Swipeable Tab Pages */}
      <TabView
        navigationState={{ index: activeTab, routes: ROUTES }}
        renderScene={renderScene}
        onIndexChange={handleTabChange}
        renderTabBar={() => null}
        initialLayout={{ width: layout.width }}
        lazy
        renderLazyPlaceholder={() => (
          <View style={{ flex: 1, alignItems: 'center', paddingTop: 40 }}>
            <ActivityIndicator color={colors.accent} />
          </View>
        )}
      />
    </View>
  );
```

- [ ] **Step 11: Add new styles to the `StyleSheet.create` block**

Add these entries alongside the existing styles:

```javascript
  tabBar:        { flexDirection: 'row', marginHorizontal: 20, marginBottom: 8, borderRadius: 14, padding: 4, borderWidth: 1 },
  tabBtn:        { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  tabBtnText:    { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },

  eventRow:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10 },
  eventMinute:   { width: 44, fontSize: 11, fontWeight: '700' },
  eventIcon:     { fontSize: 14, width: 28, textAlign: 'center' },
  eventInfo:     { flex: 1, paddingHorizontal: 6 },
  eventPlayer:   { fontSize: 13, fontWeight: '600' },
  eventAssist:   { fontSize: 11, fontWeight: '500', marginTop: 2 },
  eventLogoWrap: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  eventTeamLogo: { width: 16, height: 16 },
```

- [ ] **Step 12: Verify the app renders**

In one terminal start the backend (`uvicorn main:app --reload --port 8000`). In another:

```bash
cd frontend && npx expo start
```

Open a match detail screen. You should see the pinned header, the DETAILS / STATS / LINEUPS tab bar, and blank tab pages (placeholder). Tapping and swiping should switch tabs.

- [ ] **Step 13: Commit**

```bash
git add frontend/src/screens/MatchDetailScreen.js
git commit -m "feat(frontend): add TabView scaffold with pinned header and custom tab bar"
```

---

## Task 6: Frontend — Details Tab Content (Events + H2H + Form + Table)

**Files:**
- Modify: `frontend/src/screens/MatchDetailScreen.js`

- [ ] **Step 1: Replace the `'details'` branch of `renderScene` with the full Details tab**

Find:
```javascript
  if (route.key === 'details') {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }
```

Replace with:

```javascript
  if (route.key === 'details') {
    const teamRows = standings.filter(row => row.team_id === homeId || row.team_id === awayId);
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }
      >
        {/* Events */}
        <View style={s.section}>
          <SectionTitle label="EVENTS" colors={colors} />
          {loading.events ? <InlineSpinner colors={colors} /> :
           errors.events  ? <RetryButton onPress={fetchEvents} colors={colors} /> :
           events.length === 0 ? (
             <Text style={[s.empty, { color: colors.mutedForeground }]}>No events yet.</Text>
           ) : (
             <View style={[s.tableCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
               {events.map((ev, i) => (
                 <EventRow
                   key={`${ev.minute}-${ev.type}-${i}`}
                   event={ev}
                   colors={colors}
                   isDark={isDark}
                   isLast={i === events.length - 1}
                 />
               ))}
             </View>
           )}
        </View>

        {/* Head to Head */}
        <View style={s.section}>
          <SectionTitle label="HEAD TO HEAD" colors={colors} />
          {loading.h2h ? <InlineSpinner colors={colors} /> :
           errors.h2h   ? <RetryButton onPress={fetchH2h} colors={colors} /> :
           h2h.length === 0 ? (
             <Text style={[s.empty, { color: colors.mutedForeground }]}>No previous meetings found.</Text>
           ) : (
             <View style={[s.tableCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
               {h2h.map((m, i) => {
                 const hScore = m.score?.home ?? '–';
                 const aScore = m.score?.away ?? '–';
                 const hWin   = m.score?.home != null && m.score.home > m.score.away;
                 const aWin   = m.score?.away != null && m.score.away > m.score.home;
                 return (
                   <TouchableOpacity
                     key={m.id ?? i}
                     activeOpacity={0.7}
                     onPress={() => { hapticSelect(); navigation.push('MatchDetail', { match: m, leagueCode }); }}
                     style={[s.h2hRow, { borderBottomColor: colors.border, borderBottomWidth: i === h2h.length - 1 ? 0 : 1 }]}
                   >
                     <Text style={[s.h2hDate, { color: colors.mutedForeground }]}>
                       {m.date ? new Date(m.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) : '–'}
                     </Text>
                     <Text style={[s.h2hTeam, { color: hWin ? colors.foreground : colors.mutedForeground, fontWeight: hWin ? '800' : '500' }]} numberOfLines={1}>
                       {m.teams?.home?.name ?? '–'}
                     </Text>
                     <Text style={[s.h2hScore, { color: colors.foreground }]}>{hScore} – {aScore}</Text>
                     <Text style={[s.h2hTeam, { color: aWin ? colors.foreground : colors.mutedForeground, fontWeight: aWin ? '800' : '500', textAlign: 'right' }]} numberOfLines={1}>
                       {m.teams?.away?.name ?? '–'}
                     </Text>
                   </TouchableOpacity>
                 );
               })}
             </View>
           )}
        </View>

        {/* Recent Form */}
        <View style={s.section}>
          <SectionTitle label="RECENT FORM" colors={colors} />
          {loading.form ? <InlineSpinner colors={colors} /> :
           errors.form   ? <RetryButton onPress={fetchForm} colors={colors} /> : (
             <View style={[s.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
               <View style={s.formRow}>
                 <Text style={[s.formTeamLabel, { color: colors.foreground }]} numberOfLines={1}>
                   {match.teams?.home?.name}
                 </Text>
                 <View style={s.formBadges}>
                   {homeFormBadges.length > 0
                     ? homeFormBadges.map((r, i) => <FormBadge key={i} result={r} colors={colors} />)
                     : <Text style={[s.formNone, { color: colors.mutedForeground }]}>No data</Text>}
                 </View>
               </View>
               <View style={[s.formDivider, { backgroundColor: colors.border }]} />
               <View style={s.formRow}>
                 <Text style={[s.formTeamLabel, { color: colors.foreground }]} numberOfLines={1}>
                   {match.teams?.away?.name}
                 </Text>
                 <View style={s.formBadges}>
                   {awayFormBadges.length > 0
                     ? awayFormBadges.map((r, i) => <FormBadge key={i} result={r} colors={colors} />)
                     : <Text style={[s.formNone, { color: colors.mutedForeground }]}>No data</Text>}
                 </View>
               </View>
             </View>
           )}
        </View>

        {/* League Table */}
        <View style={s.section}>
          <SectionTitle label="LEAGUE TABLE" colors={colors} />
          {loading.standings ? <InlineSpinner colors={colors} /> :
           errors.standings  ? <RetryButton onPress={fetchStandings} colors={colors} /> : (
             <View style={[s.tableCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
               {teamRows.length === 0 ? (
                 <Text style={[s.empty, { color: colors.mutedForeground }]}>No standings data.</Text>
               ) : teamRows.map((row, i) => (
                 <TouchableOpacity
                   key={row.team_name ?? i}
                   activeOpacity={0.7}
                   onPress={() => navigateToTeam({ id: row.team_id, name: row.team_name, logo: row.team_logo }, row)}
                   style={[s.tableRow, {
                     backgroundColor: colors.accent + '1A',
                     borderBottomColor: colors.border,
                     borderBottomWidth: i === teamRows.length - 1 ? 0 : 1,
                   }]}
                 >
                   <Text style={[s.tablePos, { color: colors.accent }]}>{row.position}</Text>
                   <View style={[s.tableLogoWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                     {row.team_logo
                       ? <Image source={{ uri: row.team_logo }} style={s.tableTeamLogo} />
                       : <Text style={{ fontSize: 8 }}>⚽</Text>}
                   </View>
                   <Text style={[s.tableTeam, { color: colors.accent }]} numberOfLines={1}>{row.team_name}</Text>
                   <Text style={[s.tableCell, { color: colors.mutedForeground }]}>{row.games_played}</Text>
                   <Text style={[s.tableCell, { color: colors.mutedForeground }]}>
                     {row.goal_difference > 0 ? `+${row.goal_difference}` : row.goal_difference}
                   </Text>
                   <Text style={[s.tablePts, { color: colors.accent }]}>{row.points}</Text>
                 </TouchableOpacity>
               ))}
             </View>
           )}
        </View>
      </ScrollView>
    );
  }
```

- [ ] **Step 2: Update the `renderScene` `useCallback` dependency array**

The deps array currently reads `[colors.background]`. Replace it with:

```javascript
}, [
  colors, isDark, loading, errors, events, h2h, homeFormBadges, awayFormBadges,
  standings, homeId, awayId, match, leagueCode, refreshing,
  fetchEvents, fetchH2h, fetchForm, fetchStandings,
  matchStats, homeLineup, awayLineup, fetchStats, fetchLineups,
  navigation, navigateToTeam,
]);
```

- [ ] **Step 3: Verify the Details tab shows events + H2H + form + table**

Open a finished match. The Details tab should display an Events card (with goals/cards), Head-to-Head, Recent Form badges, and League Table. Pull-to-refresh should work on this tab.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/screens/MatchDetailScreen.js
git commit -m "feat(frontend): implement Details tab with events, H2H, form, and table"
```

---

## Task 7: Frontend — Stats Tab

**Files:**
- Modify: `frontend/src/screens/MatchDetailScreen.js`

- [ ] **Step 1: Replace the `'stats'` branch of `renderScene`**

Find:
```javascript
  if (route.key === 'stats') {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }
```

Replace with:

```javascript
  if (route.key === 'stats') {
    const homeData = matchStats?.find(t => t.team_id === match.teams?.home?.id);
    const awayData = matchStats?.find(t => t.team_id === match.teams?.away?.id);
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
      >
        {loading.stats ? <InlineSpinner colors={colors} /> :
         errors.stats   ? <RetryButton onPress={fetchStats} colors={colors} /> :
         !matchStats    ? (
           <Text style={[s.empty, { color: colors.mutedForeground }]}>
             Match stats will be available once the game begins.
           </Text>
         ) : (
           <View style={[s.statsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
             {STAT_LABELS.map(label => {
               const home = homeData?.stats?.[label] ?? 0;
               const away = awayData?.stats?.[label] ?? 0;
               if (home === 0 && away === 0) return null;
               const displayLabel = label === 'Passes %' ? 'PASS ACCURACY %' : label.toUpperCase();
               return (
                 <StatBar
                   key={label}
                   label={displayLabel}
                   home={home}
                   away={away}
                   colors={colors}
                   isDark={isDark}
                 />
               );
             })}
           </View>
         )}
      </ScrollView>
    );
  }
```

- [ ] **Step 2: Verify the Stats tab works**

Navigate to a finished match. Tap the STATS tab — it should fetch and show stat bars for all available stats. For a pre-match fixture it should show the placeholder message. Swipe between tabs to confirm the gesture works.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/screens/MatchDetailScreen.js
git commit -m "feat(frontend): implement Stats tab with all 15 stat bars and lazy fetch"
```

---

## Task 8: Frontend — Lineups Tab + Final Cleanup

**Files:**
- Modify: `frontend/src/screens/MatchDetailScreen.js`

- [ ] **Step 1: Replace the `'lineups'` branch of `renderScene`**

Find:
```javascript
  if (route.key === 'lineups') {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }
```

Replace with:

```javascript
  if (route.key === 'lineups') {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <View style={s.section}>
          <SectionTitle label="LINEUPS" colors={colors} />
          {loading.lineups ? <InlineSpinner colors={colors} /> :
           errors.lineups  ? <RetryButton onPress={fetchLineups} colors={colors} /> :
           (!homeLineup && !awayLineup) ? (
             <Text style={[s.empty, { color: colors.mutedForeground }]}>Lineups not yet available.</Text>
           ) : (
             <>
               {[homeLineup, awayLineup].filter(Boolean).map((lineup) => (
                 <PitchFormation
                   key={`pitch-${lineup.team_id}`}
                   players={lineup.players ?? []}
                   formation={lineup.formation}
                   teamName={lineup.team_name}
                   isDark={isDark}
                   onPlayerPress={(p) => {
                     hapticSelect();
                     navigation.push('PlayerDetail', {
                       playerId: p.id, playerName: p.name, playerPhoto: p.photo,
                     });
                   }}
                 />
               ))}
               {[homeLineup, awayLineup].filter(Boolean).map((lineup) => (
                 (lineup.substitutes ?? []).length > 0 && (
                   <View key={`subs-${lineup.team_id}`} style={[s.lineupSection, { backgroundColor: colors.card, borderColor: colors.border, marginBottom: 16 }]}>
                     <View style={[s.lineupHeader, { borderBottomColor: colors.border }]}>
                       <View style={[s.lineupLogoWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                         {lineup.team_logo
                           ? <Image source={{ uri: lineup.team_logo }} style={s.lineupTeamLogo} />
                           : <Text style={{ fontSize: 12 }}>⚽</Text>}
                       </View>
                       <Text style={[s.lineupTeamName, { color: colors.foreground }]} numberOfLines={1}>
                         {lineup.team_name}
                       </Text>
                       <Text style={[s.lineupSubtitleText, { color: colors.mutedForeground }]}>SUBSTITUTES</Text>
                     </View>
                     {lineup.substitutes.map((p, i) => {
                       const player = typeof p === 'string' ? { name: p } : p;
                       return (
                         <TouchableOpacity
                           key={player.id ?? `sub-${i}`}
                           activeOpacity={0.7}
                           onPress={() => {
                             hapticSelect();
                             player.id && navigation.push('PlayerDetail', {
                               playerId: player.id, playerName: player.name, playerPhoto: player.photo,
                             });
                           }}
                           style={[s.playerRow, {
                             borderBottomWidth: i === lineup.substitutes.length - 1 ? 0 : 1,
                             borderBottomColor: colors.border,
                             backgroundColor: i % 2 === 0 ? 'transparent' : (isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)'),
                           }]}
                         >
                           <Text style={[s.playerNum, { color: colors.mutedForeground }]}>{player.number ?? '–'}</Text>
                           <View style={[s.playerPhotoWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                             {player.photo
                               ? <Image source={{ uri: player.photo }} style={s.playerPhoto} />
                               : <View style={s.playerPhotoPlaceholder} />}
                           </View>
                           <Text style={[s.playerName, { color: colors.foreground }]} numberOfLines={1}>{player.name}</Text>
                           {player.pos && (
                             <Text style={[s.playerPos, { color: colors.mutedForeground }]}>{player.pos}</Text>
                           )}
                         </TouchableOpacity>
                       );
                     })}
                   </View>
                 )
               ))}
             </>
           )}
        </View>
      </ScrollView>
    );
  }
```

- [ ] **Step 2: Remove the now-dead `stats` and `hasStats` lines**

Delete these two lines near the top of `MatchDetailScreen` (currently around line 174–175):

```javascript
  const stats      = match.stats;
  const hasStats   = stats && Object.keys(stats).length > 0;
```

They are no longer referenced.

- [ ] **Step 3: Verify all three tabs work end-to-end**

Open a finished match with lineups available:
- **Details tab**: Events + H2H + Recent Form + League Table visible; pull-to-refresh works
- **Stats tab** (tap or swipe): Stats bars visible for all available stats; "Match stats will be available" shown for pre-match
- **Lineups tab** (tap or swipe): Pitch formation + substitutes visible; tapping a player navigates to PlayerDetail
- Swiping left/right between all three tabs works smoothly

- [ ] **Step 4: Final commit**

```bash
git add frontend/src/screens/MatchDetailScreen.js
git commit -m "feat(frontend): complete Lineups tab and remove dead stats code"
```

---

## Done

All tasks complete. The MatchDetailScreen now has:
- Three swipeable tabs (Details · Stats · Lineups)
- Match events timeline with goals, cards, and substitutions
- Full 15-stat comparison bars fetched from a dedicated endpoint
- Lazy Stats fetch (only on first tab visit)
- Live polling every 60s for events and stats on live matches
- Pull-to-refresh on the Details tab
