import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Image,
  ScrollView, StyleSheet, RefreshControl,
} from 'react-native';
import api from '../services/api';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import { useTheme } from '../theme/ThemeContext';
import { LEAGUES } from '../constants/leagues';

const FILTERS = [
  { key: 'all',     label: 'All' },
  { key: 'today',   label: 'Today' },
  { key: 'week',    label: 'This Week' },
  { key: 'results', label: 'Results' },
];

function toYMD(date) {
  return date.toISOString().split('T')[0];
}

function getDateRange(filterKey) {
  const now = new Date();
  const today = toYMD(now);
  switch (filterKey) {
    case 'today':
      return { date_from: today, date_to: today };
    case 'week': {
      const weekAhead = new Date(now);
      weekAhead.setDate(weekAhead.getDate() + 7);
      return { date_from: today, date_to: toYMD(weekAhead) };
    }
    case 'results': {
      const pastWeek = new Date(now);
      pastWeek.setDate(pastWeek.getDate() - 14);
      return { date_from: toYMD(pastWeek), date_to: today };
    }
    case 'all':
    default: {
      const past = new Date(now);
      past.setDate(past.getDate() - 7);
      const future = new Date(now);
      future.setDate(future.getDate() + 7);
      return { date_from: toYMD(past), date_to: toYMD(future) };
    }
  }
}

function formatGroupDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, day] = dateStr.split('T')[0].split('-').map(Number);
  const local = new Date(y, m - 1, day);
  if (isNaN(local)) return dateStr;
  return local.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

function formatKickoff(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d)) return '';
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: false });
}

export default function MatchesScreen() {
  const { colors, isDark } = useTheme();
  const [league, setLeague] = useState('PL');
  const [filter, setFilter] = useState('today');
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  const fetchMatches = useCallback(async (code, filterKey) => {
    setLoading(true);
    setError(null);
    try {
      const { date_from, date_to } = getDateRange(filterKey);
      const { data } = await api.get(`/api/matches/${code}`, {
        params: { date_from, date_to },
      });
      const allMatches = (Array.isArray(data) ? data : [])
        .flatMap(group => group.matches ?? []);

      if (filterKey === 'results') {
        const finished = allMatches.filter(
          m => (m.status ?? '').toLowerCase() === 'finished'
        );
        finished.sort((a, b) => new Date(b.date ?? b.match_date) - new Date(a.date ?? a.match_date));
        setMatches(finished);
      } else {
        allMatches.sort((a, b) => new Date(a.date ?? a.match_date) - new Date(b.date ?? b.match_date));
        setMatches(allMatches);
      }
    } catch (e) {
      setError(e.response?.data?.detail ?? 'Failed to load matches.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMatches(league, filter);
  }, [league, filter]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchMatches(league, filter);
    setRefreshing(false);
  }, [league, filter, fetchMatches]);

  const grouped = useMemo(() => {
    const groups = {};
    matches.forEach(m => {
      const raw = m.date ?? m.match_date ?? '';
      const dayKey = raw.split('T')[0];
      if (!groups[dayKey]) groups[dayKey] = [];
      groups[dayKey].push(m);
    });
    return Object.entries(groups).map(([day, items]) => ({ day, items }));
  }, [matches]);

  const renderStatBar = (label, home, away) => {
    const h = home || 0;
    const a = away || 0;
    const total = h + a || 1;
    const hPct = (h / total) * 100;
    return (
      <View key={label} style={styles.statBarWrapper}>
        <View style={styles.statBarLabels}>
          <Text style={[styles.statBarVal, { color: colors.mutedForeground }]}>{h}</Text>
          <Text style={[styles.statBarLabel, { color: colors.mutedForeground }]}>{label.toUpperCase()}</Text>
          <Text style={[styles.statBarVal, { color: colors.mutedForeground }]}>{a}</Text>
        </View>
        <View style={styles.statBarContainer}>
          <View style={[styles.statBarFill, { width: `${hPct}%`, backgroundColor: colors.accent }]} />
          <View style={[styles.statBarEmpty, { backgroundColor: isDark ? '#21262D' : '#E1E4E8' }]} />
          <View style={[styles.statBarFill, { width: `${100 - hPct}%`, backgroundColor: '#F97316' }]} />
        </View>
      </View>
    );
  };

  const renderMatch = (match) => {
    const home = match.teams?.home?.name ?? match.home_team ?? '–';
    const away = match.teams?.away?.name ?? match.away_team ?? '–';
    const homeLogo = match.teams?.home?.logo;
    const awayLogo = match.teams?.away?.logo;
    const scoreHome = match.score?.home ?? match.home_score;
    const scoreAway = match.score?.away ?? match.away_score;
    const status = (match.status ?? '').toLowerCase();
    const isLive = status === 'live' || status === 'in_play';
    const isFinished = status === 'finished' || status === 'ft';
    const matchId = match.id ?? `${home}-${away}-${match.date}`;
    const isExpanded = expandedId === matchId;

    return (
      <TouchableOpacity
        key={matchId}
        style={[
          styles.matchCard,
          {
            backgroundColor: colors.card,
            borderColor: isLive ? colors.accent : colors.border,
            borderWidth: 1,
            shadowColor: isLive ? colors.accent : '#000',
            shadowOpacity: isLive ? 0.15 : 0.05,
            shadowRadius: isLive ? 15 : 5,
            elevation: isLive ? 5 : 2,
          },
        ]}
        activeOpacity={0.7}
        onPress={() => setExpandedId(isExpanded ? null : matchId)}
      >
        <View style={styles.matchCardHeader}>
          <Text style={[styles.compLabel, { color: colors.mutedForeground }]}>
            {LEAGUES.find(l => l.code === league)?.label.toUpperCase()}
          </Text>
          {isLive ? (
            <View style={[styles.liveBadge, { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.2)' }]}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          ) : (
            <Text style={[styles.timeLabel, { color: isFinished ? colors.mutedForeground : colors.foreground }]}>
              {isFinished ? 'FT' : formatKickoff(match.date ?? match.match_date)}
            </Text>
          )}
        </View>

        <View style={styles.scoreRow}>
          <View style={styles.teamInfo}>
            <View style={[styles.teamLogoWrapper, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
              {homeLogo ? <Image source={{ uri: homeLogo }} style={styles.teamLogo} /> : <Text>⚽</Text>}
            </View>
            <Text style={[styles.teamName, { color: colors.foreground }]} numberOfLines={1}>{home}</Text>
          </View>

          <View style={[styles.scoreBubble, { backgroundColor: isDark ? '#0D1117' : '#F6F8FA' }]}>
            <Text style={[styles.scoreText, { color: isLive ? colors.accent : colors.foreground }]}>
              {scoreHome != null ? scoreHome : '-'} - {scoreAway != null ? scoreAway : '-'}
            </Text>
          </View>

          <View style={[styles.teamInfo, styles.teamInfoRight]}>
            <Text style={[styles.teamName, { color: colors.foreground }]} numberOfLines={1}>{away}</Text>
            <View style={[styles.teamLogoWrapper, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
              {awayLogo ? <Image source={{ uri: awayLogo }} style={styles.teamLogo} /> : <Text>⚽</Text>}
            </View>
          </View>
        </View>

        {isExpanded && (
          <View style={[styles.expandedContent, { borderTopColor: colors.border }]}>
            <View style={styles.statsHeader}>
              <Text style={[styles.statsTitle, { color: colors.foreground }]}>Match Stats</Text>
            </View>
            <View style={styles.statsList}>
              {renderStatBar('Possession', match.stats?.possession_home || 50, match.stats?.possession_away || 50)}
              {renderStatBar('Shots on Target', match.stats?.shots_home, match.stats?.shots_away)}
              {renderStatBar('Corners', match.stats?.corners_home, match.stats?.corners_away)}
            </View>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderGroup = ({ item: group }) => (
    <View style={styles.group}>
      <Text style={[styles.groupTitle, { color: colors.mutedForeground }]}>
        {formatGroupDate(group.day).toUpperCase()}
      </Text>
      {group.items.map(renderMatch)}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* League selector */}
      <View style={styles.leagueBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.leagueBarContent}
        >
          {LEAGUES.map(l => {
            const isSelected = league === l.code;
            return (
              <TouchableOpacity
                key={l.code}
                style={[
                  styles.leagueBtn,
                  {
                    borderColor: isSelected ? colors.accent : colors.border,
                    backgroundColor: isSelected ? colors.accent + '1A' : colors.card,
                    borderWidth: 1,
                  },
                ]}
                onPress={() => setLeague(l.code)}
              >
                <Text style={[
                  styles.leagueBtnText,
                  { color: isSelected ? colors.accent : colors.mutedForeground },
                ]}>
                  {l.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Filter tabs */}
      <View style={styles.filterContainer}>
        <View style={[styles.filterBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {FILTERS.map(f => {
            const active = filter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[
                  styles.filterTab,
                  { backgroundColor: active ? colors.accent : 'transparent' },
                ]}
                onPress={() => setFilter(f.key)}
              >
                <Text style={[
                  styles.filterTabText,
                  { color: active ? '#fff' : colors.mutedForeground },
                ]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Content */}
      {loading && <LoadingState />}
      {!loading && error && (
        <ErrorState message={error} onRetry={() => fetchMatches(league, filter)} />
      )}
      {!loading && !error && (
        <FlatList
          data={grouped}
          keyExtractor={item => item.day}
          renderItem={renderGroup}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
          }
          ListEmptyComponent={
            <Text style={[styles.empty, { color: colors.mutedForeground }]}>
              No matches found for this period.
            </Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1 },

  leagueBar:         { paddingVertical: 12 },
  leagueBarContent:  { paddingHorizontal: 20, gap: 12 },
  leagueBtn:         { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  leagueBtnText:     { fontSize: 13, fontWeight: '600' },

  filterContainer:  { paddingHorizontal: 20, marginBottom: 12 },
  filterBar:        { flexDirection: 'row', padding: 4, borderRadius: 12, borderWidth: 1 },
  filterTab:        { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  filterTabText:    { fontSize: 12, fontWeight: '700' },

  list:             { paddingHorizontal: 20, paddingBottom: 40 },
  group:            { marginBottom: 24 },
  groupTitle:       { fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 12 },

  matchCard:        { borderRadius: 20, padding: 16, marginBottom: 16, borderWidth: 1 },
  matchCardHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  compLabel:        { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  timeLabel:        { fontSize: 10, fontWeight: '800' },
  liveBadge:        { flexDirection: 'row', alignItems: 'center', gap: 6, px: 8, py: 2, borderRadius: 12, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2 },
  liveDot:          { width: 6, height: 6, borderRadius: 3, backgroundColor: '#EF4444' },
  liveText:         { fontSize: 10, fontWeight: '800', color: '#EF4444' },

  scoreRow:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  teamInfo:         { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  teamInfoRight:    { justifyContent: 'flex-end' },
  teamLogoWrapper:  { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  teamLogo:         { width: 22, height: 22 },
  teamName:         { fontSize: 14, fontWeight: '800', flex: 1 },
  scoreBubble:      { minWidth: 70, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginHorizontal: 10 },
  scoreText:        { fontSize: 18, fontWeight: '900' },

  expandedContent:  { borderTopWidth: 1, marginTop: 16, paddingTop: 16 },
  statsHeader:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  statsTitle:       { fontSize: 12, fontWeight: '700' },
  statsList:        { gap: 16 },

  statBarWrapper:   { gap: 6 },
  statBarLabels:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statBarVal:       { fontSize: 11, fontWeight: '700' },
  statBarLabel:     { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  statBarContainer: { height: 6, borderRadius: 3, overflow: 'hidden', flexDirection: 'row', gap: 4 },
  statBarFill:      { height: '100%', borderRadius: 3 },
  statBarEmpty:     { flex: 1, height: '100%', borderRadius: 3 },

  empty:            { textAlign: 'center', marginTop: 60, fontSize: 14 },
});
