import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View, Text, FlatList, Image, TouchableOpacity,
  StyleSheet, RefreshControl, ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import api from '../services/api';
import ErrorState from '../components/ErrorState';
import { useTheme } from '../theme/ThemeContext';

const HEADER_H = 38;
const MATCH_H  = 60;

function formatDateLabel(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  const todayKey    = new Date().toISOString().split('T')[0];
  const tomorrowKey = (() => { const t = new Date(); t.setDate(t.getDate() + 1); return t.toISOString().split('T')[0]; })();
  const dayKey = dateStr.split('T')[0];
  if (dayKey === todayKey)    return 'TODAY';
  if (dayKey === tomorrowKey) return 'TOMORROW';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase();
}

function formatKickoff(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d)) return '';
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: false });
}

export default function AllMatchesView({ leagueCode }) {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation();
  const [raw, setRaw]           = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMatches = useCallback(async () => {
    setError(null);
    try {
      const { data } = await api.get(`/api/matches/${leagueCode}`);
      const all = (Array.isArray(data) ? data : [])
        .flatMap(g => g.matches ?? [])
        .sort((a, b) => new Date(a.date ?? a.match_date) - new Date(b.date ?? b.match_date));
      setRaw(all);
    } catch (e) {
      setError(e.response?.data?.detail ?? 'Failed to load matches.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [leagueCode]);

  useEffect(() => { fetchMatches(); }, [leagueCode]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchMatches();
  }, [fetchMatches]);

  // Build flat list items and pre-compute offsets for getItemLayout
  const { items, initialScrollIndex } = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const groups = {};
    raw.forEach(m => {
      const day = (m.date ?? m.match_date ?? '').split('T')[0];
      if (!groups[day]) groups[day] = [];
      groups[day].push(m);
    });

    const flat = [];
    let offset = 0;
    let upcomingIdx = 0;
    let foundUpcoming = false;

    Object.entries(groups).forEach(([day, matches]) => {
      const headerIdx = flat.length;
      // Mark the header of the first day >= today that has a non-finished match
      if (!foundUpcoming && day >= todayStr) {
        const hasUnplayed = matches.some(m => {
          const s = (m.status ?? '').toLowerCase();
          return s !== 'finished' && s !== 'ft';
        });
        if (hasUnplayed) {
          upcomingIdx = headerIdx;
          foundUpcoming = true;
        }
      }
      flat.push({ type: 'header', day, key: `h-${day}`, height: HEADER_H, offset });
      offset += HEADER_H;

      matches.forEach(m => {
        flat.push({ type: 'match', match: m, key: `m-${m.id ?? m.date + m.teams?.home?.name}`, height: MATCH_H, offset });
        offset += MATCH_H;
      });
    });

    return { items: flat, initialScrollIndex: upcomingIdx };
  }, [raw]);

  const getItemLayout = useCallback((_, index) => {
    const item = items[index];
    if (!item) return { length: MATCH_H, offset: 0, index };
    return { length: item.height, offset: item.offset, index };
  }, [items]);

  const renderItem = useCallback(({ item }) => {
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
    const home = m.teams?.home?.name ?? m.home_team ?? '–';
    const away = m.teams?.away?.name ?? m.away_team ?? '–';
    const homeLogo = m.teams?.home?.logo;
    const awayLogo = m.teams?.away?.logo;
    const scoreHome = m.score?.home ?? m.home_score;
    const scoreAway = m.score?.away ?? m.away_score;
    const status = (m.status ?? '').toLowerCase();
    const isLive     = status === 'live' || status === 'in_play';
    const isFinished = status === 'finished' || status === 'ft';
    const isPending  = !isLive && !isFinished;

    const homeWin = isFinished && scoreHome != null && scoreAway != null && scoreHome > scoreAway;
    const awayWin = isFinished && scoreHome != null && scoreAway != null && scoreAway > scoreHome;

    return (
      <TouchableOpacity
        style={[styles.matchRow, { borderBottomColor: colors.border, backgroundColor: colors.background }]}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('MatchDetail', { match: m, leagueCode })}
      >
        {/* Status column */}
        <View style={styles.statusCol}>
          {isLive ? (
            <>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>{m.minute ? `${m.minute}'` : 'LIVE'}</Text>
            </>
          ) : isFinished ? (
            <Text style={[styles.statusText, { color: colors.mutedForeground }]}>FT</Text>
          ) : (
            <Text style={[styles.statusText, { color: colors.mutedForeground }]}>
              {formatKickoff(m.date ?? m.match_date)}
            </Text>
          )}
        </View>

        {/* Divider */}
        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* Teams + scores */}
        <View style={styles.teamsCol}>
          <View style={styles.teamLine}>
            <View style={[styles.logoWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }]}>
              {homeLogo
                ? <Image source={{ uri: homeLogo }} style={styles.teamLogo} />
                : <Text style={styles.emoji}>⚽</Text>}
            </View>
            <Text
              style={[styles.teamName, { color: colors.foreground }, homeWin && styles.winner]}
              numberOfLines={1}
            >{home}</Text>
            {!isPending && (
              <Text style={[styles.score, {
                color: isLive ? colors.accent : colors.foreground,
                fontWeight: homeWin ? '900' : '600',
              }]}>{scoreHome ?? '-'}</Text>
            )}
          </View>

          <View style={styles.teamLine}>
            <View style={[styles.logoWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }]}>
              {awayLogo
                ? <Image source={{ uri: awayLogo }} style={styles.teamLogo} />
                : <Text style={styles.emoji}>⚽</Text>}
            </View>
            <Text
              style={[styles.teamName, { color: colors.foreground }, awayWin && styles.winner]}
              numberOfLines={1}
            >{away}</Text>
            {!isPending && (
              <Text style={[styles.score, {
                color: isLive ? colors.accent : colors.foreground,
                fontWeight: awayWin ? '900' : '600',
              }]}>{scoreAway ?? '-'}</Text>
            )}
          </View>
        </View>
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

  if (error) return <ErrorState message={error} onRetry={fetchMatches} />;

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
        <Text style={[styles.empty, { color: colors.mutedForeground }]}>No matches found.</Text>
      }
      initialNumToRender={30}
      windowSize={10}
    />
  );
}

const styles = StyleSheet.create({
  center:         { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:           { paddingBottom: 40 },

  dateHeader:     { height: HEADER_H, justifyContent: 'center', paddingHorizontal: 16, borderBottomWidth: 1 },
  dateHeaderText: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },

  matchRow:       { height: MATCH_H, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1 },
  statusCol:      { width: 48, alignItems: 'center', justifyContent: 'center', gap: 3 },
  statusText:     { fontSize: 11, fontWeight: '700' },
  liveDot:        { width: 6, height: 6, borderRadius: 3, backgroundColor: '#EF4444' },
  liveText:       { fontSize: 10, fontWeight: '800', color: '#EF4444' },

  divider:        { width: 1, height: '60%', marginRight: 12 },

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
