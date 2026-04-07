import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Modal,
  ScrollView, RefreshControl, StyleSheet, ActivityIndicator,
} from 'react-native';
import api from '../services/api';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';

const LEAGUES = [
  { code: 'PL',  label: 'Premier League' },
  { code: 'PD',  label: 'La Liga' },
  { code: 'BL1', label: 'Bundesliga' },
  { code: 'SA',  label: 'Serie A' },
  { code: 'FL1', label: 'Ligue 1' },
  { code: 'CL',  label: 'Champions League' },
];

export default function StandingsScreen() {
  const [league, setLeague] = useState('PL');
  const [standings, setStandings] = useState([]);
  const [leagueName, setLeagueName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [teamStats, setTeamStats] = useState(null);
  const [teamStatsLoading, setTeamStatsLoading] = useState(false);

  const fetchStandings = useCallback(async (code) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get(`/api/standings/${code}`);
      const rows = data?.stage?.[0]?.standings ?? [];
      setLeagueName(data?.league?.name ?? code);
      setStandings(rows);
    } catch (e) {
      setError(e.response?.data?.detail ?? 'Failed to load standings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStandings(league); }, [league]);

  const fetchTeamStats = useCallback(async (teamId) => {
    setTeamStatsLoading(true);
    setTeamStats(null);
    try {
      const today = new Date().toISOString().split('T')[0];
      const past = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const { data } = await api.get(`/api/matches/${league}`, {
        params: { date_from: past, date_to: today },
      });
      const allMatches = (Array.isArray(data) ? data : [])
        .flatMap(group => group.matches ?? []);

      // Filter finished matches involving this team
      const teamMatches = allMatches
        .filter(m => {
          const homeId = m.teams?.home?.id;
          const awayId = m.teams?.away?.id;
          return (homeId === teamId || awayId === teamId) &&
                 m.status?.toLowerCase() === 'finished';
        })
        .sort((a, b) => new Date(a.date ?? a.match_date) - new Date(b.date ?? b.match_date));

      // Form: W/D/L for last 5 finished matches
      const form = teamMatches.slice(-5).map(m => {
        const isHome = m.teams?.home?.id === teamId;
        const goalsFor     = isHome ? (m.score?.home ?? 0) : (m.score?.away ?? 0);
        const goalsAgainst = isHome ? (m.score?.away ?? 0) : (m.score?.home ?? 0);
        if (goalsFor > goalsAgainst) return 'W';
        if (goalsFor < goalsAgainst) return 'L';
        return 'D';
      });

      // Clean sheets: finished games where team conceded 0
      const cleanSheets = teamMatches.filter(m => {
        const isHome = m.teams?.home?.id === teamId;
        const conceded = isHome ? (m.score?.away ?? -1) : (m.score?.home ?? -1);
        return conceded === 0;
      }).length;

      setTeamStats({ form, cleanSheets });
    } catch {
      setTeamStats({ form: [], cleanSheets: null });
    } finally {
      setTeamStatsLoading(false);
    }
  }, [league]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchStandings(league);
    setRefreshing(false);
  }, [league, fetchStandings]);

  const renderRow = ({ item: row, index }) => (
    <TouchableOpacity
      style={[styles.row, index % 2 === 0 && styles.rowAlt]}
      onPress={() => { setSelectedTeam(row); fetchTeamStats(row.team_id); }}
    >
      <Text style={[styles.cell, styles.pos]}>{row.position}</Text>
      <Text style={[styles.cell, styles.team]} numberOfLines={1}>{row.team_name}</Text>
      <Text style={styles.cell}>{row.games_played}</Text>
      <Text style={styles.cell}>{row.won}</Text>
      <Text style={styles.cell}>{row.drawn}</Text>
      <Text style={styles.cell}>{row.lost}</Text>
      <Text style={styles.cell}>
        {row.goal_difference > 0 ? `+${row.goal_difference}` : row.goal_difference}
      </Text>
      <Text style={[styles.cell, styles.pts]}>{row.points}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.leagueBar}
        contentContainerStyle={styles.leagueBarContent}
      >
        {LEAGUES.map(l => (
          <TouchableOpacity
            key={l.code}
            style={[styles.leagueBtn, league === l.code && styles.leagueBtnActive]}
            onPress={() => setLeague(l.code)}
          >
            <Text style={[styles.leagueBtnText, league === l.code && styles.leagueBtnTextActive]}>
              {l.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading && <LoadingState />}
      {!loading && error && (
        <ErrorState message={error} onRetry={() => fetchStandings(league)} />
      )}

      {!loading && !error && (
        <>
          <View style={[styles.row, styles.header]}>
            <Text style={[styles.cell, styles.pos, styles.headerText]}>#</Text>
            <Text style={[styles.cell, styles.team, styles.headerText]}>Team</Text>
            <Text style={[styles.cell, styles.headerText]}>MP</Text>
            <Text style={[styles.cell, styles.headerText]}>W</Text>
            <Text style={[styles.cell, styles.headerText]}>D</Text>
            <Text style={[styles.cell, styles.headerText]}>L</Text>
            <Text style={[styles.cell, styles.headerText]}>GD</Text>
            <Text style={[styles.cell, styles.pts, styles.headerText]}>Pts</Text>
          </View>
          <FlatList
            data={standings}
            keyExtractor={item => String(item.team_id ?? item.position)}
            renderItem={renderRow}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" />
            }
            ListEmptyComponent={
              <Text style={styles.empty}>No standings data available.</Text>
            }
          />
        </>
      )}

      <Modal
        visible={!!selectedTeam}
        animationType="slide"
        onRequestClose={() => { setSelectedTeam(null); setTeamStats(null); }}
      >
        {selectedTeam && (
          <View style={styles.modal}>
            <TouchableOpacity style={styles.closeBtn} onPress={() => { setSelectedTeam(null); setTeamStats(null); }}>
              <Text style={styles.closeBtnText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{selectedTeam.team_name}</Text>
            <Text style={styles.modalLeague}>{leagueName} · Rank #{selectedTeam.position}</Text>
            <View style={styles.statGrid}>
              {[
                ['Points',        selectedTeam.points],
                ['Played',        selectedTeam.games_played],
                ['Won',           selectedTeam.won],
                ['Drawn',         selectedTeam.drawn],
                ['Lost',          selectedTeam.lost],
                ['Goals For',     selectedTeam.goals_scored],
                ['Goals Against', selectedTeam.goals_conceded],
                ['Goal Diff',     selectedTeam.goal_difference > 0
                  ? `+${selectedTeam.goal_difference}`
                  : selectedTeam.goal_difference],
                ['Clean Sheets',  teamStatsLoading ? '…' : (teamStats?.cleanSheets ?? '–')],
              ].map(([label, value]) => (
                <View key={label} style={styles.statCard}>
                  <Text style={styles.statValue}>{value}</Text>
                  <Text style={styles.statLabel}>{label}</Text>
                </View>
              ))}
            </View>

            {/* Form: last 5 results */}
            <View style={styles.formSection}>
              <Text style={styles.formTitle}>Last 5 Results</Text>
              {teamStatsLoading && (
                <ActivityIndicator size="small" color="#2563EB" style={{ marginTop: 8 }} />
              )}
              {!teamStatsLoading && teamStats?.form.length === 0 && (
                <Text style={styles.formEmpty}>No recent data available.</Text>
              )}
              {!teamStatsLoading && teamStats?.form.length > 0 && (
                <View style={styles.formBadges}>
                  {teamStats.form.map((result, i) => (
                    <View key={i} style={[styles.formBadge, styles[`form${result}`]]}>
                      <Text style={styles.formBadgeText}>{result}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container:            { flex: 1, backgroundColor: '#fff' },

  leagueBar:            { borderBottomWidth: 1, borderBottomColor: '#E5E7EB', flexGrow: 0 },
  leagueBarContent:     { paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', gap: 8 },
  leagueBtn:            { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: '#F3F4F6' },
  leagueBtnActive:      { backgroundColor: '#2563EB' },
  leagueBtnText:        { fontSize: 13, color: '#374151' },
  leagueBtnTextActive:  { color: '#fff', fontWeight: '600' },

  header:               { backgroundColor: '#F9FAFB', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  headerText:           { fontWeight: '700', color: '#374151' },
  row:                  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  rowAlt:               { backgroundColor: '#FAFAFA' },
  cell:                 { width: 32, textAlign: 'center', fontSize: 13, color: '#111827' },
  pos:                  { width: 28 },
  team:                 { flex: 1, textAlign: 'left', paddingLeft: 8 },
  pts:                  { color: '#2563EB', fontWeight: '700' },
  empty:                { textAlign: 'center', marginTop: 40, color: '#9CA3AF', fontSize: 14 },

  modal:                { flex: 1, backgroundColor: '#fff', paddingTop: 60, paddingHorizontal: 24 },
  closeBtn:             { alignSelf: 'flex-start', marginBottom: 28 },
  closeBtnText:         { color: '#2563EB', fontSize: 16, fontWeight: '600' },
  modalTitle:           { fontSize: 28, fontWeight: '800', color: '#111827', marginBottom: 4 },
  modalLeague:          { fontSize: 14, color: '#6B7280', marginBottom: 32 },
  statGrid:             { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard:             { width: '30%', backgroundColor: '#F3F4F6', borderRadius: 12, padding: 16, alignItems: 'center' },
  statValue:            { fontSize: 24, fontWeight: '700', color: '#111827' },
  statLabel:            { fontSize: 11, color: '#6B7280', marginTop: 4, textAlign: 'center' },

  formSection:          { marginTop: 28 },
  formTitle:            { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 10 },
  formEmpty:            { fontSize: 13, color: '#9CA3AF', marginTop: 4 },
  formBadges:           { flexDirection: 'row', gap: 8 },
  formBadge:            { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  formBadgeText:        { fontSize: 14, fontWeight: '700', color: '#fff' },
  formW:                { backgroundColor: '#16A34A' },
  formD:                { backgroundColor: '#CA8A04' },
  formL:                { backgroundColor: '#DC2626' },
});
