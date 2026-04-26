import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, Image, ScrollView, StyleSheet, ActivityIndicator, RefreshControl,
  TouchableOpacity, useWindowDimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { LEAGUES } from '../constants/leagues';
import { BlurView } from 'expo-blur';
import PitchFormation from '../components/PitchFormation';
import api from '../services/api';
import { hapticSelect, hapticSuccess } from '../utils/haptics';
import { TabView } from 'react-native-tab-view';
import MatchBellIcon from '../components/MatchBellIcon';

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

function liveHeaderLabel(match) {
  const ss = match.status_short ?? '';
  if (ss === 'HT')  return 'LIVE · HT';
  if (ss === 'ET')  return 'LIVE · ET';
  if (ss === 'BT')  return 'LIVE · BT';
  if (ss === 'P')   return 'LIVE · PEN';
  const m = match.minute;
  if (!m) return 'LIVE';
  if (ss === '1H' && m > 45) return `LIVE · 45+${m - 45}'`;
  if (ss === '2H' && m > 90) return `LIVE · 90+${m - 90}'`;
  return `LIVE · ${m}'`;
}

function formatDateTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d)) return '';
  return (
    d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })
    + ' · '
    + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: false })
  );
}

function getResultFromFixture(fixture, teamId) {
  const homeId = fixture.teams?.home?.id;
  const hScore = fixture.score?.home ?? null;
  const aScore = fixture.score?.away ?? null;
  if (hScore === null || aScore === null) return null;
  if (hScore === aScore) return 'D';
  const teamIsHome = homeId === teamId;
  const teamWon    = teamIsHome ? hScore > aScore : aScore > hScore;
  return teamWon ? 'W' : 'L';
}

function SectionTitle({ label, colors }) {
  return <Text style={[s.sectionTitle, { color: colors.mutedForeground }]}>{label}</Text>;
}

function InlineSpinner({ colors }) {
  return <ActivityIndicator size="small" color={colors.accent} style={{ marginVertical: 16 }} />;
}

function RetryButton({ onPress, colors }) {
  return (
    <TouchableOpacity onPress={onPress} style={[s.retryBtn, { borderColor: colors.border }]}>
      <Text style={[s.retryText, { color: colors.mutedForeground }]}>Failed to load — tap to retry</Text>
    </TouchableOpacity>
  );
}

function FormBadge({ result, colors }) {
  const bg =
    result === 'W' ? colors.chartGreen :
    result === 'D' ? colors.mutedForeground :
    colors.destructive;
  return (
    <View style={[s.formBadge, { backgroundColor: bg }]}>
      <Text style={s.formBadgeText}>{result}</Text>
    </View>
  );
}

function StatBar({ label, home, away, colors, isDark }) {
  const h = home ?? 0;
  const a = away ?? 0;
  const total = h + a || 1;
  const hPct = (h / total) * 100;
  return (
    <View style={s.statBarWrap}>
      <View style={s.statBarLabels}>
        <Text style={[s.statBarVal, { color: colors.foreground, fontWeight: h > a ? '800' : '500' }]}>{h}</Text>
        <Text style={[s.statBarLabel, { color: colors.mutedForeground }]}>{label}</Text>
        <Text style={[s.statBarVal, { color: colors.foreground, fontWeight: a > h ? '800' : '500' }]}>{a}</Text>
      </View>
      <View style={s.statBarTrack}>
        <View style={[s.statBarFill, { width: `${hPct}%`, backgroundColor: colors.accent }]} />
        <View style={{ width: 3 }} />
        <View style={[s.statBarFill, { width: `${100 - hPct}%`, backgroundColor: isDark ? '#9CA3AF' : '#6B7280' }]} />
      </View>
    </View>
  );
}

function EventRow({ event, colors, homeId }) {
  const { type, detail } = event;
  let icon;
  if (type === 'Goal')       icon = detail === 'Own Goal' ? '⚽ (O.G)' : '⚽';
  else if (type === 'Card')  icon = detail === 'Yellow Card' ? '🟨' : '🟥';
  else if (type === 'subst') icon = '↕';
  else                       return null;

  const isHome = event.team_id === homeId;

  const minuteStr = event.extra_minute
    ? `${event.minute}+${event.extra_minute}'`
    : `${event.minute ?? '?'}'`;

  return (
    <View style={s.eventRow}>
      <View style={s.eventSide}>
        {isHome && (
          <View style={s.eventHomeContent}>
            <Text style={s.eventIcon}>{icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[s.eventPlayer, { color: type === 'subst' ? colors.destructive : colors.foreground }]} numberOfLines={1}>
                {event.player_name}
              </Text>
              {(type === 'Goal' || type === 'subst') && event.assist_name ? (
                <Text style={[s.eventAssist, { color: type === 'subst' ? colors.chartGreen : colors.mutedForeground }]} numberOfLines={1}>
                  ↳ {event.assist_name}
                </Text>
              ) : null}
            </View>
          </View>
        )}
      </View>
      <Text style={[s.eventMinute, { color: colors.mutedForeground }]}>{minuteStr}</Text>
      <View style={s.eventSide}>
        {!isHome && (
          <View style={s.eventAwayContent}>
            <View style={{ flex: 1 }}>
              <Text style={[s.eventPlayer, { color: type === 'subst' ? colors.destructive : colors.foreground, textAlign: 'right' }]} numberOfLines={1}>
                {event.player_name}
              </Text>
              {(type === 'Goal' || type === 'subst') && event.assist_name ? (
                <Text style={[s.eventAssist, { color: type === 'subst' ? colors.chartGreen : colors.mutedForeground, textAlign: 'right' }]} numberOfLines={1}>
                  {event.assist_name} ↲
                </Text>
              ) : null}
            </View>
            <Text style={s.eventIcon}>{icon}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function MatchDivider({ label, colors }) {
  return (
    <View style={[s.dividerRow, { borderTopColor: colors.border, borderBottomColor: colors.border }]}>
      <Text style={[s.dividerText, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

function buildEventItems(events, match) {
  const reversed = [...events].reverse();
  const items = [];
  let htInserted = false;

  for (const ev of reversed) {
    if (!htInserted && (ev.minute ?? 0) <= 45) {
      items.push({ _divider: 'HT' });
      htInserted = true;
    }
    items.push(ev);
  }

  const pastHt = match.status === 'finished' ||
    ['HT', '2H', 'ET', 'BT', 'P'].includes(match.status_short);
  if (!htInserted && pastHt) {
    items.push({ _divider: 'HT' });
  }

  if (match.status === 'finished') {
    const ss = match.status_short;
    const ftLabel = ss === 'AET' ? 'FULL TIME (AET)' : ss === 'PEN' ? 'FULL TIME (PEN)' : 'FULL TIME';
    items.unshift({ _divider: 'FT', label: ftLabel });
  } else if (match.status_short === 'HT') {
    items.unshift({ _divider: 'HT_LIVE', label: 'HALF TIME' });
  }

  return items;
}

export default function MatchDetailScreen({ route }) {
  const { match, leagueCode } = route.params;
  const { colors, isDark } = useTheme();
  const navigation = useNavigation();
  const leagueLabel = LEAGUES.find(l => l.code === leagueCode)?.label ?? '';
  const layout = useWindowDimensions();

  const homeId    = match.teams?.home?.id;
  const awayId    = match.teams?.away?.id;
  const fixtureId = match.id;

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <MatchBellIcon match={match} size={22} style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center', marginRight: 4 }} />
      ),
    });
  }, [match]);

  const navigateToTeam = useCallback((teamObj, standingsRow) => {
    hapticSelect();
    const team = standingsRow ?? {
      team_id:   teamObj.id,
      team_name: teamObj.name,
      team_logo: teamObj.logo,
    };
    navigation.push('TeamDetail', { team, leagueCode, leagueLabel });
  }, [navigation, leagueCode, leagueLabel]);

  const [standings,  setStandings]  = useState([]);
  const [h2h,        setH2h]        = useState([]);
  const [homeForm,   setHomeForm]   = useState([]);
  const [awayForm,   setAwayForm]   = useState([]);
  const [lineups,    setLineups]    = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab,  setActiveTab]  = useState(0);
  const [events,     setEvents]     = useState([]);
  const [matchStats, setMatchStats] = useState(null);
  const [ratings,    setRatings]    = useState({});
  const [captainIds, setCaptainIds] = useState(new Set());
  const statsFetched = useRef(false);

  const [loading, setLoading] = useState({
    standings: true, h2h: true, form: true, lineups: true,
    events: true, stats: false,
  });
  const [errors, setErrors] = useState({
    standings: false, h2h: false, form: false, lineups: false,
    events: false, stats: false,
  });

  const fetchStandings = useCallback(() => {
    if (!leagueCode) { setLoading(p => ({ ...p, standings: false })); return; }
    setLoading(p => ({ ...p, standings: true }));
    setErrors(p => ({ ...p, standings: false }));
    api.get(`/api/standings/${leagueCode}`)
      .then(r => setStandings(r.data?.stage?.[0]?.standings ?? []))
      .catch(() => { setStandings([]); setErrors(p => ({ ...p, standings: true })); })
      .finally(() => setLoading(p => ({ ...p, standings: false })));
  }, [leagueCode]);

  const fetchH2h = useCallback(() => {
    setLoading(p => ({ ...p, h2h: true }));
    setErrors(p => ({ ...p, h2h: false }));
    api.get(`/api/h2h/${homeId}/${awayId}`)
      .then(r => setH2h(Array.isArray(r.data) ? r.data : []))
      .catch(() => { setH2h([]); setErrors(p => ({ ...p, h2h: true })); })
      .finally(() => setLoading(p => ({ ...p, h2h: false })));
  }, [homeId, awayId]);

  const fetchForm = useCallback(() => {
    setLoading(p => ({ ...p, form: true }));
    setErrors(p => ({ ...p, form: false }));
    Promise.all([
      api.get(`/api/teams/${homeId}/last-fixtures`).then(r => setHomeForm(Array.isArray(r.data) ? r.data : [])).catch(() => setHomeForm([])),
      api.get(`/api/teams/${awayId}/last-fixtures`).then(r => setAwayForm(Array.isArray(r.data) ? r.data : [])).catch(() => setAwayForm([])),
    ])
      .catch(() => setErrors(p => ({ ...p, form: true })))
      .finally(() => setLoading(p => ({ ...p, form: false })));
  }, [homeId, awayId]);

  const fetchLineups = useCallback(() => {
    setLoading(p => ({ ...p, lineups: true }));
    setErrors(p => ({ ...p, lineups: false }));
    api.get(`/api/fixtures/${fixtureId}/lineups`)
      .then(r => setLineups(Array.isArray(r.data) ? r.data : []))
      .catch(() => { setLineups([]); setErrors(p => ({ ...p, lineups: true })); })
      .finally(() => setLoading(p => ({ ...p, lineups: false })));
  }, [fixtureId]);

  const fetchRatings = useCallback(() => {
    api.get(`/api/fixtures/${fixtureId}/players`)
      .then(r => {
        const data = r.data ?? {};
        setRatings(data.ratings ?? {});
        setCaptainIds(new Set(data.captains ?? []));
      })
      .catch(() => { setRatings({}); setCaptainIds(new Set()); });
  }, [fixtureId]);

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

  const fetchAll = useCallback(() => {
    fetchStandings();
    fetchH2h();
    fetchForm();
    fetchLineups();
    fetchEvents();
    fetchRatings();
  }, [fetchStandings, fetchH2h, fetchForm, fetchLineups, fetchEvents, fetchRatings]);

  const handleTabChange = useCallback((index) => {
    setActiveTab(index);
    if (index === 1 && !statsFetched.current) {
      statsFetched.current = true;
      fetchStats();
    }
  }, [fetchStats]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const isFinished = (match.status ?? '').toLowerCase() === 'finished';
  const isLive     = (match.status ?? '').toLowerCase() === 'live';

  useEffect(() => {
    if (!isLive) return;
    const id = setInterval(() => {
      fetchEvents();
      if (statsFetched.current) fetchStats();
    }, 60_000);
    return () => clearInterval(id);
  }, [isLive, fetchEvents, fetchStats]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    fetchAll();
    setTimeout(() => { setRefreshing(false); hapticSuccess(); }, 1500);
  }, [fetchAll]);

  const homeFormBadges = homeForm.slice(0, 5).map(f => getResultFromFixture(f, homeId)).filter(Boolean);
  const awayFormBadges = awayForm.slice(0, 5).map(f => getResultFromFixture(f, awayId)).filter(Boolean);

  const homeLineup = lineups?.find(l => l.team_id === homeId) ?? null;
  const awayLineup = lineups?.find(l => l.team_id === awayId) ?? null;

  const subbedOutIds = useMemo(() => {
    const s = new Set();
    events.filter(e => e.type === 'subst').forEach(e => { if (e.player_id) s.add(e.player_id); });
    return s;
  }, [events]);

  const subbedInIds = useMemo(() => {
    const s = new Set();
    events.filter(e => e.type === 'subst').forEach(e => { if (e.assist_id) s.add(e.assist_id); });
    return s;
  }, [events]);

  const renderScene = useCallback(({ route: r }) => {
    if (r.key === 'details') {
      const teamRows = standings.filter(row => row.team_id === homeId || row.team_id === awayId);
      return (
        <ScrollView
          style={{ flex: 1, backgroundColor: colors.background }}
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
          }
        >
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
                     <View style={[s.tableLogoWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.05)' }]}>
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

          {/* Events */}
          <View style={s.section}>
            <SectionTitle label="EVENTS" colors={colors} />
            {loading.events ? <InlineSpinner colors={colors} /> :
             errors.events  ? <RetryButton onPress={fetchEvents} colors={colors} /> :
             events.length === 0 ? (
               <Text style={[s.empty, { color: colors.mutedForeground }]}>No events yet.</Text>
             ) : (
               <View style={[s.tableCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                 {buildEventItems(events, match).map((item, i) => {
                   if (item._divider) {
                     const label = item.label ?? (item._divider === 'HT' || item._divider === 'HT_LIVE' ? 'HALF TIME' : 'FULL TIME');
                     return <MatchDivider key={`divider-${i}`} label={label} colors={colors} />;
                   }
                   return (
                     <EventRow
                       key={`${item.minute}-${item.type}-${i}`}
                       event={item}
                       colors={colors}
                       homeId={homeId}
                     />
                   );
                 })}
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
                       ? homeFormBadges.map((res, i) => <FormBadge key={i} result={res} colors={colors} />)
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
                       ? awayFormBadges.map((res, i) => <FormBadge key={i} result={res} colors={colors} />)
                       : <Text style={[s.formNone, { color: colors.mutedForeground }]}>No data</Text>}
                   </View>
                 </View>
               </View>
             )}
          </View>

        </ScrollView>
      );
    }

    if (r.key === 'stats') {
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

    if (r.key === 'lineups') {
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
                {homeLineup && (
                   <PitchFormation
                     key={`pitch-${homeLineup.team_id}`}
                     players={homeLineup.players ?? []}
                     formation={homeLineup.formation}
                     teamName={homeLineup.team_name}
                     isDark={isDark}
                     subbedOutIds={subbedOutIds}
                     ratings={ratings}
                     captainIds={captainIds}
                     onPlayerPress={(p) => {
                       hapticSelect();
                       navigation.push('PlayerDetail', {
                         playerId: p.id, playerName: p.name, playerPhoto: p.photo,
                       });
                     }}
                   />
                 )}
                {awayLineup && (
                   <PitchFormation
                     key={`pitch-${awayLineup.team_id}`}
                     players={awayLineup.players ?? []}
                     formation={awayLineup.formation}
                     teamName={awayLineup.team_name}
                     isDark={isDark}
                     subbedOutIds={subbedOutIds}
                     ratings={ratings}
                     captainIds={captainIds}
                     onPlayerPress={(p) => {
                       hapticSelect();
                       navigation.push('PlayerDetail', {
                         playerId: p.id, playerName: p.name, playerPhoto: p.photo,
                       });
                     }}
                   />
                 )}
                 {[homeLineup, awayLineup].filter(Boolean).map((lineup) => (
                   (lineup.substitutes ?? []).length > 0 && (
                     <View key={`subs-${lineup.team_id}`} style={[s.lineupSection, { backgroundColor: colors.card, borderColor: colors.border, marginBottom: 16 }]}>
                       <View style={[s.lineupHeader, { borderBottomColor: colors.border }]}>
                         <View style={[s.lineupLogoWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.05)' }]}>
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
                             <View style={[s.playerPhotoWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.05)' }]}>
                               {player.photo
                                 ? <Image source={{ uri: player.photo }} style={s.playerPhoto} />
                                 : <View style={s.playerPhotoPlaceholder} />}
                             </View>
                             {captainIds.has(player.id) && (
                               <View style={[s.captainBadge, { backgroundColor: colors.accent + '1A' }]}>
                                 <Text style={[s.captainText, { color: colors.accent }]}>C</Text>
                               </View>
                             )}
                             <Text style={[s.playerName, { color: colors.foreground }]} numberOfLines={1}>{player.name}</Text>
                             {ratings[player.id] != null && (
                               <View style={[s.ratingBadge, { backgroundColor: ratings[player.id] >= 7.5 ? '#22C55E' : ratings[player.id] >= 6.5 ? '#F59E0B' : '#EF4444' }]}>
                                 <Text style={s.ratingText}>{ratings[player.id]}</Text>
                               </View>
                             )}
                             {subbedInIds.has(player.id) && (
                               <Text style={[s.subIcon, { color: colors.chartGreen }]}>↕</Text>
                             )}
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

    return null;
  }, [
    colors, isDark, loading, errors, events, h2h, homeFormBadges, awayFormBadges,
    standings, homeId, awayId, match, leagueCode, refreshing,
    fetchEvents, fetchH2h, fetchForm, fetchStandings,
    matchStats, homeLineup, awayLineup, fetchStats, fetchLineups,
    navigation, navigateToTeam, onRefresh, subbedOutIds, subbedInIds, ratings,
    captainIds,
  ]);

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
            <View style={[s.teamLogoWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.05)' }]}>
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
                {liveHeaderLabel(match)}
              </Text>
            )}
          </View>

          <TouchableOpacity
            style={[s.teamCol, s.teamColRight]}
            activeOpacity={0.7}
            onPress={() => match.teams?.away && navigateToTeam(match.teams.away, standings.find(r => r.team_id === awayId))}
          >
            <View style={[s.teamLogoWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.05)' }]}>
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
}

const s = StyleSheet.create({
  container:    { flex: 1 },
  section:      { paddingHorizontal: 20, marginBottom: 24 },
  sectionTitle: { fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 12 },
  empty:        { fontSize: 13, fontWeight: '600', paddingVertical: 8 },

  headerCard:   { margin: 20, borderRadius: 24, borderWidth: 1, padding: 20 },
  teamsRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  teamCol:      { flex: 1, alignItems: 'center', gap: 10 },
  teamColRight: { alignItems: 'center' },
  teamLogoWrap: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  teamLogo:     { width: 40, height: 40 },
  emoji:        { fontSize: 24 },
  teamName:     { fontSize: 13, fontWeight: '700', textAlign: 'center' },
  middleCol:    { alignItems: 'center', paddingHorizontal: 8 },
  scoreText:    { fontSize: 28, fontWeight: '900' },
  vsText:       { fontSize: 18, fontWeight: '800' },
  liveLabel:    { fontSize: 10, fontWeight: '800', marginTop: 4 },
  venue:        { fontSize: 12, fontWeight: '600', textAlign: 'center', marginBottom: 4 },
  kickoff:      { fontSize: 12, fontWeight: '600', textAlign: 'center' },

  tabBar:        { flexDirection: 'row', marginHorizontal: 20, marginBottom: 8, borderRadius: 14, padding: 4, borderWidth: 1 },
  tabBtn:        { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  tabBtnText:    { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },

  // match stats
  statsCard:    { borderRadius: 20, borderWidth: 1, padding: 16, gap: 16 },
  statBarWrap:  { gap: 6 },
  statBarLabels:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statBarVal:   { fontSize: 13, minWidth: 30 },
  statBarLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  statBarTrack: { height: 6, borderRadius: 3, flexDirection: 'row', overflow: 'hidden' },
  statBarFill:  { height: '100%', borderRadius: 3 },

  tableCard:    { borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
  tableRow:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10 },
  tablePos:     { width: 22, fontSize: 12, fontWeight: '700' },
  tableLogoWrap:{ width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  tableTeamLogo:{ width: 14, height: 14 },
  tableTeam:    { flex: 1, fontSize: 13, fontWeight: '700' },
  tableCell:    { width: 28, textAlign: 'center', fontSize: 12 },
  tablePts:     { width: 36, textAlign: 'right', fontSize: 13, fontWeight: '800' },

  h2hRow:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12, gap: 8 },
  h2hDate:      { width: 52, fontSize: 10, fontWeight: '600' },
  h2hTeam:      { flex: 1, fontSize: 12 },
  h2hScore:     { fontSize: 14, fontWeight: '800', minWidth: 48, textAlign: 'center' },

  formCard:     { borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
  formRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, gap: 12 },
  formTeamLabel:{ flex: 1, fontSize: 13, fontWeight: '700' },
  formBadges:   { flexDirection: 'row', gap: 6 },
  formBadge:    { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  formBadgeText:{ color: '#fff', fontSize: 10, fontWeight: '800' },
  formNone:     { fontSize: 12, fontWeight: '600' },
  formDivider:  { height: 1, marginHorizontal: 16 },

  retryBtn:           { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  retryText:          { fontSize: 13, fontWeight: '600' },

  dividerRow:       { paddingVertical: 6, paddingHorizontal: 12, borderTopWidth: 1, borderBottomWidth: 1, alignItems: 'center' },
  dividerText:      { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  eventRow:         { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12 },
  eventSide:        { flex: 1 },
  eventHomeContent: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  eventAwayContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6 },
  eventMinute:      { width: 52, fontSize: 11, fontWeight: '700', textAlign: 'center' },
  eventIcon:        { fontSize: 14 },
  eventPlayer:      { fontSize: 13, fontWeight: '600' },
  eventAssist:      { fontSize: 11, fontWeight: '500', marginTop: 2 },

  lineupSection:      { borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
  lineupHeader:       { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, gap: 10 },
  lineupLogoWrap:     { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  lineupTeamLogo:     { width: 16, height: 16 },
  lineupTeamName:     { flex: 1, fontSize: 14, fontWeight: '800' },
  formationBadge:     { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  formationText:      { fontSize: 11, fontWeight: '800' },
  lineupSubtitle:     { paddingHorizontal: 14, paddingVertical: 6 },
  lineupSubtitleText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
  playerRow:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8 },
  playerNum:          { width: 22, fontSize: 11, fontWeight: '700', textAlign: 'center' },
  playerPhotoWrap:    { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginHorizontal: 8 },
  playerPhoto:        { width: 24, height: 24, borderRadius: 12 },
  playerPhotoPlaceholder: { width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(128,128,128,0.15)' },
  playerName:         { flex: 1, fontSize: 13, fontWeight: '600' },
  subIcon:            { fontSize: 12, fontWeight: '800', marginRight: 6 },
  playerPos:          { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, width: 28, textAlign: 'right' },
  ratingBadge:        { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginRight: 6 },
  ratingText:         { color: '#fff', fontSize: 10, fontWeight: '800' },

  captainBadge:  { backgroundColor: '#F59E0B1A', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4, marginRight: 4 },
  captainText:   { fontSize: 10, fontWeight: '900' },

});
