import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, Image, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import api from '../services/api';
import ErrorState from '../components/ErrorState';
import { useTheme } from '../theme/ThemeContext';
import { hapticSelect, hapticSuccess } from '../utils/haptics';

const CL_CODE = 'CL';

function fmtDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d)) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function TeamLine({ team, score, status, bold, colors, isDark }) {
  const hasScore = score != null;
  return (
    <View style={s.teamLine}>
      <View style={[s.logoWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
        {team?.logo
          ? <Image source={{ uri: team.logo }} style={s.teamLogo} resizeMode="contain" />
          : <Text style={{ fontSize: 9 }}>⚽</Text>
        }
      </View>
      <Text
        style={[s.teamName, { color: bold ? colors.foreground : colors.mutedForeground, fontWeight: bold ? '800' : '500' }]}
        numberOfLines={1}
      >
        {team?.name ?? 'TBD'}
      </Text>
      <Text style={[s.score, { color: bold ? colors.foreground : colors.mutedForeground, fontWeight: bold ? '800' : '400' }]}>
        {hasScore ? score : status === 'pre-match' ? '-' : '-'}
      </Text>
    </View>
  );
}

function LegCard({ fixture, legLabel, colors, isDark, onPress }) {
  if (!fixture) {
    return (
      <View style={[s.legCard, { borderColor: colors.border }]}>
        <Text style={[s.legLabel, { color: colors.mutedForeground }]}>{legLabel} · TBD</Text>
        <View style={[s.teamLine, { opacity: 0.4 }]}>
          <View style={[s.logoWrap, { backgroundColor: colors.muted }]} />
          <Text style={[s.teamName, { color: colors.mutedForeground }]}>TBD</Text>
        </View>
        <View style={[s.teamLine, { opacity: 0.4 }]}>
          <View style={[s.logoWrap, { backgroundColor: colors.muted }]} />
          <Text style={[s.teamName, { color: colors.mutedForeground }]}>TBD</Text>
        </View>
      </View>
    );
  }

  const { teams, score, status, date } = fixture;
  const isLive = status === 'live';

  return (
    <TouchableOpacity
      style={[s.legCard, { borderColor: colors.border }, isLive && { borderColor: '#ef4444' }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={s.legHeader}>
        <Text style={[s.legLabel, { color: colors.mutedForeground }]}>
          {legLabel} · {fmtDate(date)}
        </Text>
        {isLive && (
          <View style={s.liveDot}>
            <Text style={s.liveText}>LIVE</Text>
          </View>
        )}
      </View>
      <TeamLine team={teams?.home} score={score?.home} status={status} bold={score?.home > score?.away} colors={colors} isDark={isDark} />
      <TeamLine team={teams?.away} score={score?.away} status={status} bold={score?.away > score?.home} colors={colors} isDark={isDark} />
    </TouchableOpacity>
  );
}

function TieCard({ leg1, leg2, isSingleLeg, colors, isDark, navigation }) {
  const home = leg1?.teams?.home;
  const away = leg1?.teams?.away;

  const aggA = isSingleLeg
    ? leg1?.score?.home ?? null
    : ((leg1?.score?.home ?? null) !== null && (leg2?.score?.away ?? null) !== null)
      ? (leg1.score.home ?? 0) + (leg2.score.away ?? 0)
      : null;
  const aggB = isSingleLeg
    ? leg1?.score?.away ?? null
    : ((leg1?.score?.away ?? null) !== null && (leg2?.score?.home ?? null) !== null)
      ? (leg1.score.away ?? 0) + (leg2.score.home ?? 0)
      : null;

  const bothDone = isSingleLeg
    ? leg1?.status === 'finished'
    : leg1?.status === 'finished' && leg2?.status === 'finished';

  const winner = bothDone && aggA != null && aggB != null
    ? aggA > aggB ? home : aggB > aggA ? away : null
    : null;

  const leg2StatusShort = leg2?.status_short ?? '';
  const aetOrPen = bothDone && (leg2StatusShort === 'AET' || leg2StatusShort === 'PEN')
    ? ` (${leg2StatusShort})`
    : '';

  const goToMatch = (fixture) => {
    if (!fixture) return;
    hapticSelect();
    navigation.navigate('MatchDetail', { match: fixture, leagueCode: CL_CODE });
  };

  return (
    <View style={[s.tieCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {isSingleLeg ? (
        <LegCard fixture={leg1} legLabel="Final" colors={colors} isDark={isDark} onPress={() => goToMatch(leg1)} />
      ) : (
        <>
          <LegCard fixture={leg1} legLabel="Leg 1" colors={colors} isDark={isDark} onPress={() => goToMatch(leg1)} />
          <View style={[s.divider, { backgroundColor: colors.border }]} />
          <LegCard fixture={leg2} legLabel="Leg 2" colors={colors} isDark={isDark} onPress={() => goToMatch(leg2)} />
        </>
      )}

      {bothDone && aggA != null && (
        <>
          <View style={[s.divider, { backgroundColor: colors.border }]} />
          <View style={s.aggRow}>
            <Text style={[s.aggText, { color: colors.mutedForeground }]}>
              {winner ? (
                <Text style={{ color: colors.foreground, fontWeight: '700' }}>{winner.name} advances</Text>
              ) : (
                <Text style={{ color: colors.mutedForeground }}>Draw{aetOrPen}</Text>
              )}
              {'  '}
              <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
                AGG {aggA} – {aggB}{aetOrPen}
              </Text>
            </Text>
          </View>
        </>
      )}
    </View>
  );
}

function RoundSection({ round, colors, isDark, navigation }) {
  const { display, leg1, leg2, single_leg } = round;

  // Pair up legs: for each leg1 fixture find leg2 where teams are reversed
  const ties = leg1.map((l1) => {
    const l2 = leg2.find(
      (f) => f.teams?.home?.id === l1.teams?.away?.id && f.teams?.away?.id === l1.teams?.home?.id
    ) ?? null;
    return { leg1: l1, leg2: l2 };
  });

  // If no fixtures at all for this round, show placeholder
  if (ties.length === 0) {
    ties.push({ leg1: null, leg2: null });
  }

  return (
    <View style={s.roundSection}>
      <View style={[s.roundHeader, { borderLeftColor: '#16a34a' }]}>
        <Text style={[s.roundTitle, { color: colors.foreground }]}>{display.toUpperCase()}</Text>
      </View>
      {ties.map((tie, i) => (
        <TieCard
          key={i}
          leg1={tie.leg1}
          leg2={tie.leg2}
          isSingleLeg={single_leg}
          colors={colors}
          isDark={isDark}
          navigation={navigation}
        />
      ))}
    </View>
  );
}

export default function CLBracketView() {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation();
  const [rounds, setRounds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const { data } = await api.get('/api/cl-bracket');
      setRounds(data?.rounds ?? []);
    } catch (e) {
      setError(e.response?.data?.detail ?? 'Failed to load bracket.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    hapticSuccess();
  }, [fetchData]);

  if (loading) {
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (error) return <ErrorState message={error} onRetry={fetchData} />;

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={s.scroll}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
    >
      {rounds.map((round, i) => (
        <RoundSection key={i} round={round} colors={colors} isDark={isDark} navigation={navigation} />
      ))}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  center:        { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll:        { padding: 16, gap: 24 },

  roundSection:  { gap: 10 },
  roundHeader:   { borderLeftWidth: 3, borderLeftColor: '#16a34a', paddingLeft: 10, marginBottom: 2 },
  roundTitle:    { fontSize: 13, fontWeight: '800', letterSpacing: 0.8 },

  tieCard:       { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  divider:       { height: 1 },

  legCard:       { padding: 12, borderWidth: 0, gap: 6 },
  legHeader:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  legLabel:      { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  liveDot:       { backgroundColor: '#ef4444', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  liveText:      { color: '#fff', fontSize: 9, fontWeight: '800' },

  teamLine:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoWrap:      { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  teamLogo:      { width: 16, height: 16 },
  teamName:      { flex: 1, fontSize: 13 },
  score:         { fontSize: 16, minWidth: 20, textAlign: 'right' },

  aggRow:        { paddingHorizontal: 12, paddingVertical: 8 },
  aggText:       { fontSize: 13 },
});
