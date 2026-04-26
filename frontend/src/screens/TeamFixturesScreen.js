import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View, Text, FlatList, Image, TouchableOpacity,
  StyleSheet, RefreshControl, ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import api from '../services/api';
import ErrorState from '../components/ErrorState';
import { useTheme } from '../theme/ThemeContext';
import { hapticSelect, hapticSuccess } from '../utils/haptics';
import MatchBellIcon from '../components/MatchBellIcon';

const HEADER_H  = 38;
const MATCH_H   = 62;
const DIVIDER_H = 32;

function toLocalYMD(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDateLabel(dateStr) {
  if (!dateStr) return '';
  const todayKey    = toLocalYMD(new Date());
  const tomorrow    = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowKey = toLocalYMD(tomorrow);
  const dayKey = dateStr.split('T')[0];
  if (dayKey === todayKey)    return 'TODAY';
  if (dayKey === tomorrowKey) return 'TOMORROW';
  const [y, m, d] = dayKey.split('-').map(Number);
  const local = new Date(y, m - 1, d);
  if (isNaN(local)) return dateStr;
  return local.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase();
}

function formatKickoff(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d)) return '';
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export default function TeamFixturesScreen({ route }) {
  const { teamId, teamName, leagueCode } = route.params;
  const { colors, isDark } = useTheme();
  const navigation = useNavigation();

  const [fixtures, setFixtures] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFixtures = useCallback(async () => {
    setError(null);
    try {
      const { data } = await api.get(`/api/teams/${teamId}/season-fixtures`);
      setFixtures(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.response?.data?.detail ?? 'Failed to load fixtures.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [teamId]);

  useEffect(() => { fetchFixtures(); }, [fetchFixtures]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchFixtures();
    hapticSuccess();
  }, [fetchFixtures]);

  const { items, initialScrollIndex } = useMemo(() => {
    const todayStr = toLocalYMD(new Date());

    // Split into results and upcoming
    const results  = fixtures.filter(f => {
      const st = (f.status ?? '').toLowerCase();
      return st === 'finished' || st === 'ft';
    });
    const upcoming = fixtures.filter(f => {
      const st = (f.status ?? '').toLowerCase();
      return st !== 'finished' && st !== 'ft';
    });

    const flat = [];
    let offset = 0;

    const addSection = (label, matches) => {
      if (matches.length === 0) return;
      flat.push({ type: 'divider', label, key: `div-${label}`, height: DIVIDER_H, offset });
      offset += DIVIDER_H;

      const groups = {};
      matches.forEach(m => {
        const day = (m.date ?? '').split('T')[0];
        if (!groups[day]) groups[day] = [];
        groups[day].push(m);
      });

      Object.entries(groups).forEach(([day, dayMatches]) => {
        flat.push({ type: 'header', day, key: `h-${label}-${day}`, height: HEADER_H, offset });
        offset += HEADER_H;
        dayMatches.forEach(m => {
          flat.push({ type: 'match', match: m, key: `m-${m.id ?? m.date}`, height: MATCH_H, offset });
          offset += MATCH_H;
        });
      });
    };

    addSection('RESULTS', results);

    // Mark where upcoming starts for scroll
    const upcomingIdx = flat.length;
    addSection('UPCOMING', upcoming);

    return { items: flat, initialScrollIndex: upcoming.length > 0 ? upcomingIdx : 0 };
  }, [fixtures]);

  const getItemLayout = useCallback((_, index) => {
    const item = items[index];
    if (!item) return { length: MATCH_H, offset: 0, index };
    return { length: item.height, offset: item.offset, index };
  }, [items]);

  const renderItem = useCallback(({ item }) => {
    if (item.type === 'divider') {
      return (
        <View style={[styles.dividerRow, { backgroundColor: colors.background }]}>
          <Text style={[styles.dividerText, { color: colors.accent }]}>{item.label}</Text>
        </View>
      );
    }

    if (item.type === 'header') {
      return (
        <View style={[styles.dateHeader, { borderBottomColor: colors.border, backgroundColor: colors.background }]}>
          <Text style={[styles.dateHeaderText, { color: colors.mutedForeground }]}>
            {formatDateLabel(item.day)}
          </Text>
        </View>
      );
    }

    const m = item.match;
    const status    = (m.status ?? '').toLowerCase();
    const isFinished = status === 'finished' || status === 'ft';
    const isLive     = status === 'live' || status === 'in_play';
    const isPending  = !isFinished && !isLive;
    const scoreHome  = m.score?.home;
    const scoreAway  = m.score?.away;
    const homeWin = isFinished && scoreHome != null && scoreAway != null && scoreHome > scoreAway;
    const awayWin = isFinished && scoreHome != null && scoreAway != null && scoreAway > scoreHome;

    return (
      <TouchableOpacity
        style={[styles.matchRow, { borderBottomColor: colors.border, backgroundColor: isLive ? 'rgba(239,68,68,0.06)' : colors.background }]}
        activeOpacity={0.7}
        onPress={() => { hapticSelect(); navigation.push('MatchDetail', { match: m, leagueCode }); }}
      >
        <View style={styles.statusCol}>
          {isLive ? (
            <Text style={styles.liveText}>{m.minute ? `${m.minute}'` : 'LIVE'}</Text>
          ) : isFinished ? (
            <Text style={[styles.statusText, { color: colors.mutedForeground }]}>FT</Text>
          ) : (
            <Text style={[styles.statusText, { color: colors.mutedForeground }]}>
              {formatKickoff(m.date)}
            </Text>
          )}
        </View>

        <View style={[styles.vertDivider, { backgroundColor: colors.border }]} />

        <View style={styles.teamsCol}>
          <View style={styles.teamLine}>
            <View style={[styles.logoWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }]}>
              {m.teams?.home?.logo
                ? <Image source={{ uri: m.teams.home.logo }} style={styles.teamLogo} />
                : <Text style={styles.emoji}>⚽</Text>}
            </View>
            <Text style={[styles.teamName, { color: colors.foreground }, homeWin && styles.winner]} numberOfLines={1}>
              {m.teams?.home?.name ?? '–'}
            </Text>
            {!isPending && (
              <Text style={[styles.score, { color: isLive ? colors.accent : colors.foreground, fontWeight: homeWin ? '900' : '600' }]}>
                {scoreHome ?? '–'}
              </Text>
            )}
          </View>
          <View style={styles.teamLine}>
            <View style={[styles.logoWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }]}>
              {m.teams?.away?.logo
                ? <Image source={{ uri: m.teams.away.logo }} style={styles.teamLogo} />
                : <Text style={styles.emoji}>⚽</Text>}
            </View>
            <Text style={[styles.teamName, { color: colors.foreground }, awayWin && styles.winner]} numberOfLines={1}>
              {m.teams?.away?.name ?? '–'}
            </Text>
            {!isPending && (
              <Text style={[styles.score, { color: isLive ? colors.accent : colors.foreground, fontWeight: awayWin ? '900' : '600' }]}>
                {scoreAway ?? '–'}
              </Text>
            )}
          </View>
        </View>

        <MatchBellIcon match={m} size={18} style={styles.bellCol} />
      </TouchableOpacity>
    );
  }, [colors, isDark, navigation, leagueCode]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (error) return <ErrorState message={error} onRetry={fetchFixtures} />;

  return (
    <FlatList
      data={items}
      keyExtractor={item => item.key}
      renderItem={renderItem}
      getItemLayout={getItemLayout}
      initialScrollIndex={initialScrollIndex}
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      ListEmptyComponent={
        <Text style={[styles.empty, { color: colors.mutedForeground }]}>No fixtures found.</Text>
      }
      initialNumToRender={30}
      windowSize={10}
    />
  );
}

const styles = StyleSheet.create({
  center:         { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:           { paddingBottom: 40 },

  dividerRow:     { height: DIVIDER_H, justifyContent: 'center', paddingHorizontal: 16 },
  dividerText:    { fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },

  dateHeader:     { height: HEADER_H, justifyContent: 'center', paddingHorizontal: 16, borderBottomWidth: 1 },
  dateHeaderText: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },

  matchRow:       { height: MATCH_H, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1 },
  bellCol:        { width: 36, alignItems: 'center', justifyContent: 'center' },
  statusCol:      { width: 48, alignItems: 'center', justifyContent: 'center' },
  statusText:     { fontSize: 11, fontWeight: '700' },
  liveText:       { fontSize: 10, fontWeight: '800', color: '#EF4444' },

  vertDivider:    { width: 1, height: '60%', marginRight: 12 },

  teamsCol:       { flex: 1, justifyContent: 'center', gap: 5, paddingRight: 12 },
  teamLine:       { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoWrap:       { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  teamLogo:       { width: 14, height: 14 },
  emoji:          { fontSize: 10 },
  teamName:       { flex: 1, fontSize: 13, fontWeight: '600' },
  winner:         { fontWeight: '800' },
  score:          { fontSize: 14, minWidth: 18, textAlign: 'right' },

  empty:          { textAlign: 'center', marginTop: 60, fontSize: 14 },
});
