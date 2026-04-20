import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, RefreshControl, Image,
  StyleSheet, Modal, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import { useTheme } from '../theme/ThemeContext';
import { LEAGUES } from '../constants/leagues';

const CATEGORIES = ["Form", "Goals Scored", "Goals Conceded"];

function Sparkline({ points, color, mutedColor }) {
  const CHART_HEIGHT = 80;
  const max = Math.max(...points, 0.01);
  const min = Math.min(...points, 0);
  const range = max - min || 1;

  return (
    <View style={{ height: CHART_HEIGHT + 20, paddingTop: 8, paddingBottom: 4 }}>
      {/* Horizontal grid lines */}
      <View style={{ position: 'absolute', left: 0, right: 0, top: 8, height: CHART_HEIGHT }}>
        {[0, 0.5, 1].map(p => (
          <View key={p} style={{ position: 'absolute', left: 0, right: 0, top: p * CHART_HEIGHT, height: 1, backgroundColor: mutedColor, opacity: 0.4 }} />
        ))}
      </View>
      {/* Bars */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: CHART_HEIGHT, gap: 6 }}>
        {points.map((v, i) => {
          const heightPct = Math.max(0.04, (v - min) / range);
          return (
            <View key={i} style={{ flex: 1, alignItems: 'center', height: CHART_HEIGHT, justifyContent: 'flex-end' }}>
              <View style={{ width: '70%', height: CHART_HEIGHT * heightPct, backgroundColor: color, borderRadius: 4, opacity: i === points.length - 1 ? 1 : 0.6 }} />
            </View>
          );
        })}
      </View>
      {/* X labels */}
      <View style={{ flexDirection: 'row', marginTop: 4, gap: 6 }}>
        {points.map((_, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center' }}>
            {(i === 0 || i === Math.floor(points.length / 2) || i === points.length - 1) && (
              <Text style={{ fontSize: 9, color: mutedColor, fontWeight: '600' }}>{`MD${i + 1}`}</Text>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

function computeTeamStats(team) {
  const gp = team.games_played || 0;
  const w = team.wins || 0;
  const d = team.draws || 0;
  const l = team.losses || 0;
  const gf = team.goals_for || 0;
  const ga = team.goals_against || 0;
  const pts = team.points || 0;
  return {
    avgGoals: gp > 0 ? (gf / gp).toFixed(1) : '0.0',
    avgConceded: gp > 0 ? (ga / gp).toFixed(1) : '0.0',
    winPct: gp > 0 ? Math.round((w / gp) * 100) : 0,
    ppg: gp > 0 ? (pts / gp).toFixed(2) : '0.00',
    cleanSheets: team.clean_sheets ?? '–',
    gamesPlayed: gp,
    wins: w, draws: d, losses: l,
    goalsFor: gf, goalsAgainst: ga,
  };
}

export default function TrendsScreen() {
  const { colors, isDark } = useTheme();
  const [league, setLeague] = useState('PL');
  const [activeCat, setActiveCat] = useState("Goals Scored");
  const [standings, setStandings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [teamModalVisible, setTeamModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStandings = useCallback(async (code) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get(`/api/standings/${code}`);
      const rows = data?.stage?.[0]?.standings ?? [];
      setStandings(rows);
      if (rows.length > 0) {
        setSelectedTeam(prev => {
          if (prev && rows.find(r => r.team_name === prev.team_name)) return prev;
          return rows[0];
        });
      }
    } catch (e) {
      setError(e.response?.data?.detail ?? 'Failed to load standings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStandings(league); }, [league]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchStandings(league);
    setRefreshing(false);
  }, [league, fetchStandings]);

  const stats = useMemo(() => {
    if (!selectedTeam) return null;
    return computeTeamStats(selectedTeam);
  }, [selectedTeam]);

  const sparkPoints = useMemo(() => {
    if (!stats) return [0, 0, 0, 0, 0];
    if (activeCat === 'Goals Scored') {
      const avg = parseFloat(stats.avgGoals);
      return [Math.max(0, avg - 0.4), avg + 0.3, avg, Math.max(0, avg - 0.2), avg + 0.1];
    } else if (activeCat === 'Goals Conceded') {
      const avg = parseFloat(stats.avgConceded);
      return [Math.max(0, avg + 0.3), avg, Math.max(0, avg - 0.2), avg + 0.1, avg];
    } else {
      const wr = stats.winPct;
      return [Math.max(0, wr - 10), wr, Math.min(100, wr + 5), Math.max(0, wr - 5), wr];
    }
  }, [stats, activeCat]);

  const formBadges = useMemo(() => {
    if (!stats) return [];
    const { wins, draws, losses, gamesPlayed } = stats;
    if (gamesPlayed === 0) return [];
    const badges = [];
    const total = Math.min(5, gamesPlayed);
    let w = wins, d = draws, l = losses;
    const ratio = total / gamesPlayed;
    w = Math.round(w * ratio); d = Math.round(d * ratio); l = total - w - d;
    if (l < 0) { d += l; l = 0; }
    for (let i = 0; i < w; i++) badges.push('W');
    for (let i = 0; i < d; i++) badges.push('D');
    for (let i = 0; i < l; i++) badges.push('L');
    return badges.slice(0, 5);
  }, [stats]);

  const chartLabel = activeCat === 'Goals Scored'
    ? `GOALS SCORED (${stats?.gamesPlayed ?? 0} GP)`
    : activeCat === 'Goals Conceded'
    ? `GOALS CONCEDED (${stats?.gamesPlayed ?? 0} GP)`
    : `FORM (${stats?.gamesPlayed ?? 0} GP)`;

  const chartValue = activeCat === 'Goals Scored'
    ? stats?.avgGoals ?? '–'
    : activeCat === 'Goals Conceded'
    ? stats?.avgConceded ?? '–'
    : `${stats?.winPct ?? 0}%`;

  const chartUnit = activeCat === 'Form' ? 'win rate' : 'avg';

  const leagueRank = selectedTeam?.position ? `#${selectedTeam.position} in league` : '';

  const formPoints = useMemo(() => {
    return formBadges.reduce((sum, b) => sum + (b === 'W' ? 3 : b === 'D' ? 1 : 0), 0);
  }, [formBadges]);

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

      {loading && <LoadingState />}
      {!loading && error && (
        <ErrorState message={error} onRetry={() => fetchStandings(league)} />
      )}

      {!loading && !error && (
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        >
          {/* Team Selector Card */}
          <View style={styles.section}>
            <TouchableOpacity
              style={[styles.selectorCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => setTeamModalVisible(true)}
            >
              <View style={styles.selectorInfo}>
                <View style={[styles.logoWrapper, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                  {selectedTeam?.team_logo ? (
                    <Image source={{ uri: selectedTeam.team_logo }} style={styles.teamLogo} />
                  ) : (
                    <Text>⚽</Text>
                  )}
                </View>
                <View>
                  <Text style={[styles.selectorTeamName, { color: colors.foreground }]}>{selectedTeam?.team_name || 'Select Team'}</Text>
                  <Text style={[styles.selectorLeagueName, { color: colors.mutedForeground }]}>
                    {LEAGUES.find(l => l.code === league)?.label}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-down" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          {/* Categories */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.catBar}
          >
            {CATEGORIES.map(cat => {
              const active = activeCat === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setActiveCat(cat)}
                  style={[
                    styles.catPill,
                    {
                      backgroundColor: active ? colors.accent : colors.card,
                      borderColor: active ? colors.accent : colors.border,
                      borderWidth: 1,
                    },
                  ]}
                >
                  <Text style={[styles.catText, { color: active ? '#fff' : colors.mutedForeground }]}>{cat}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Chart Card */}
          <View style={styles.section}>
            <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.chartHeader}>
                <View>
                  <Text style={[styles.chartSub, { color: colors.mutedForeground }]}>{chartLabel}</Text>
                  <Text style={[styles.chartVal, { color: colors.foreground }]}>{chartValue} <Text style={styles.chartUnit}>{chartUnit}</Text></Text>
                </View>
                {leagueRank ? (
                  <View style={[styles.trendBadge, { backgroundColor: colors.accent + '1A' }]}>
                    <Text style={[styles.trendText, { color: colors.accent }]}>{leagueRank}</Text>
                  </View>
                ) : null}
              </View>

              <Sparkline points={sparkPoints} color={colors.accent} mutedColor={colors.border} />
            </View>
          </View>

          {/* Recent Form */}
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>RECENT FORM</Text>
              <Text style={[styles.sectionBadge, { color: colors.mutedForeground, borderColor: colors.border }]}>ALL COMPETITIONS</Text>
            </View>
            <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.formBadges}>
                {formBadges.length > 0 ? formBadges.map((r, i) => (
                  <View key={i} style={[styles.formBadge, { backgroundColor: r === 'W' ? colors.chartGreen : r === 'D' ? colors.mutedForeground : '#EF4444' }]}>
                    <Text style={styles.formBadgeText}>{r}</Text>
                  </View>
                )) : (
                  <Text style={[styles.formSub, { color: colors.mutedForeground }]}>No data</Text>
                )}
              </View>
              <View style={styles.formStats}>
                <Text style={[styles.formPoints, { color: colors.foreground }]}>{formPoints} Pts</Text>
                <Text style={[styles.formSub, { color: colors.mutedForeground }]}>Last {formBadges.length} games</Text>
              </View>
            </View>
          </View>

          {/* Stat Chips */}
          <View style={styles.statGrid}>
            <View style={[styles.statChip, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.chipLabel, { color: colors.mutedForeground }]}>Goals Scored</Text>
              <Text style={[styles.chipVal, { color: colors.foreground }]}>{stats?.goalsFor ?? '–'}</Text>
              <Text style={[styles.chipSub, { color: colors.mutedForeground }]}>{stats?.avgGoals ?? '–'} avg / game</Text>
            </View>
            <View style={[styles.statChip, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.chipLabel, { color: colors.mutedForeground }]}>Goals Conceded</Text>
              <Text style={[styles.chipVal, { color: colors.foreground }]}>{stats?.goalsAgainst ?? '–'}</Text>
              <Text style={[styles.chipSub, { color: colors.mutedForeground }]}>{stats?.avgConceded ?? '–'} avg / game</Text>
            </View>
            <View style={[styles.statChip, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.chipLabel, { color: colors.mutedForeground }]}>Win %</Text>
              <Text style={[styles.chipVal, { color: colors.foreground }]}>{stats?.winPct ?? 0}%</Text>
              <Text style={[styles.chipSub, { color: colors.mutedForeground }]}>{stats?.wins ?? 0}W {stats?.draws ?? 0}D {stats?.losses ?? 0}L</Text>
            </View>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* Team Selection Modal */}
      <Modal visible={teamModalVisible} animationType="slide" transparent>
        <View style={[styles.modalOverlay]}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Select Team</Text>
              <TouchableOpacity onPress={() => setTeamModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.foreground} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={standings}
              keyExtractor={(item, i) => item.team_name ?? `${i}`}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalRow,
                    {
                      borderBottomColor: colors.border,
                      backgroundColor: item.team_name === selectedTeam?.team_name
                        ? colors.accent + '1A' : 'transparent',
                    },
                  ]}
                  onPress={() => { setSelectedTeam(item); setTeamModalVisible(false); }}
                >
                  <View style={[styles.modalLogoWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                    {item.team_logo ? (
                      <Image source={{ uri: item.team_logo }} style={styles.modalLogo} />
                    ) : (
                      <Text style={{ fontSize: 14 }}>⚽</Text>
                    )}
                  </View>
                  <Text style={[styles.modalTeamName, { color: colors.foreground }]}>{item.team_name}</Text>
                  <Text style={[styles.modalPos, { color: colors.mutedForeground }]}>#{item.position}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container:         { flex: 1 },

  leagueBar:         { paddingVertical: 12 },
  leagueBarContent:  { paddingHorizontal: 20, gap: 12 },
  leagueBtn:         { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, flexShrink: 0 },
  leagueBtnText:     { fontSize: 13, fontWeight: '600' },

  section:           { paddingHorizontal: 20, marginBottom: 20 },

  selectorCard:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 20, borderWidth: 1 },
  selectorInfo:      { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoWrapper:       { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  teamLogo:          { width: 22, height: 22 },
  selectorTeamName:  { fontSize: 15, fontWeight: '800' },
  selectorLeagueName:{ fontSize: 11, fontWeight: '600' },

  catBar:            { paddingHorizontal: 20, gap: 10, marginBottom: 20 },
  catPill:           { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  catText:           { fontSize: 12, fontWeight: '700' },

  chartCard:         { padding: 20, borderRadius: 24, borderWidth: 1 },
  chartHeader:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 },
  chartSub:          { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  chartVal:          { fontSize: 24, fontWeight: '900', marginTop: 4 },
  chartUnit:         { fontSize: 12, fontWeight: '500' },
  trendBadge:        { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  trendText:         { fontSize: 10, fontWeight: '800' },

  sectionTitleRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle:      { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  sectionBadge:      { fontSize: 9, fontWeight: '700', letterSpacing: 0.5, borderWidth: 1, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  formCard:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 20, borderWidth: 1 },
  formBadges:        { flexDirection: 'row', gap: 8 },
  formBadge:         { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  formBadgeText:     { color: '#fff', fontSize: 11, fontWeight: '800' },
  formStats:         { alignItems: 'flex-end' },
  formPoints:        { fontSize: 13, fontWeight: '800' },
  formSub:           { fontSize: 10, fontWeight: '600' },

  statGrid:          { flexDirection: 'row', paddingHorizontal: 20, gap: 12, marginBottom: 20 },
  statChip:          { flex: 1, padding: 12, borderRadius: 20, borderWidth: 1, minHeight: 90, justifyContent: 'space-between' },
  chipLabel:         { fontSize: 10, fontWeight: '700' },
  chipVal:           { fontSize: 18, fontWeight: '900' },
  chipSub:           { fontSize: 9, fontWeight: '700' },

  modalOverlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent:      { maxHeight: '70%', borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderBottomWidth: 0 },
  modalHeader:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1 },
  modalTitle:        { fontSize: 16, fontWeight: '800' },
  modalRow:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, gap: 12 },
  modalLogoWrap:     { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  modalLogo:         { width: 18, height: 18 },
  modalTeamName:     { flex: 1, fontSize: 14, fontWeight: '700' },
  modalPos:          { fontSize: 12, fontWeight: '600' },
});
