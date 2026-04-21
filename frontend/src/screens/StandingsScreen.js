import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Modal, Image,
  ScrollView, RefreshControl, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import api from '../services/api';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import { useTheme } from '../theme/ThemeContext';
import { LEAGUES, LEAGUE_ZONES } from '../constants/leagues';
import { hapticSelect, hapticSuccess } from '../utils/haptics';

export default function StandingsScreen() {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation();
  const [league, setLeague] = useState('PL');
  const [standings, setStandings] = useState([]);
  const [leagueName, setLeagueName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchStandings(league);
    setRefreshing(false);
    hapticSuccess();
  }, [league, fetchStandings]);

  const zones = LEAGUE_ZONES[league] ?? { clSpots: 4, relegationStart: 18 };
  const getStatusIndicator = (position) => {
    if (zones.clSpots > 0 && position <= zones.clSpots) return colors.accent;
    if (zones.relegationStart && position >= zones.relegationStart) return colors.destructive;
    return null;
  };

  const leagueLabel = LEAGUES.find(l => l.code === league)?.label ?? '';

  const renderRow = ({ item: row, index }) => {
    const indicatorColor = getStatusIndicator(row.position);
    return (
      <TouchableOpacity
        key={row.team_name ?? index}
        activeOpacity={0.7}
        onPress={() => { hapticSelect(); navigation.navigate('TeamDetail', { team: row, leagueCode: league, leagueLabel }); }}
        style={[
          styles.row,
          {
            backgroundColor: index % 2 === 0 ? 'transparent' : (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'),
            borderBottomWidth: index === standings.length - 1 ? 0 : 1,
            borderBottomColor: colors.border,
          },
        ]}
      >
        {indicatorColor && (
          <View style={[styles.statusIndicator, { backgroundColor: indicatorColor }]} />
        )}
        <Text style={[styles.cell, styles.pos, { color: colors.mutedForeground }]}>{row.position}</Text>
        <View style={styles.teamCell}>
          <View style={[styles.logoWrapper, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
            {row.team_logo ? (
              <Image source={{ uri: row.team_logo }} style={styles.teamLogo} />
            ) : (
              <Text style={styles.fallbackLogo}>⚽</Text>
            )}
          </View>
          <Text style={[styles.teamName, { color: colors.foreground }]} numberOfLines={1}>
            {row.team_name}
          </Text>
        </View>
        <Text style={[styles.cell, { color: colors.mutedForeground }]}>{row.games_played}</Text>
        <Text style={[styles.cell, { color: colors.mutedForeground }]}>
          {row.goal_difference > 0 ? `+${row.goal_difference}` : row.goal_difference}
        </Text>
        <Text style={[styles.cell, styles.pts, { color: colors.foreground }]}>{row.points}</Text>
      </TouchableOpacity>
    );
  };

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
          style={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
          }
        >
          <View style={[styles.tableCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.cardHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.mutedForeground }]}>24/25 SEASON</Text>
              <Text style={[styles.cardSubtitle, { color: colors.mutedForeground }]}>Updated 2m ago</Text>
            </View>

            <View style={[styles.row, styles.header, { borderBottomColor: colors.border }]}>
              <Text style={[styles.cell, styles.pos, styles.headerText, { color: colors.mutedForeground }]}>#</Text>
              <View style={styles.teamCell}>
                <Text style={[styles.headerText, { color: colors.mutedForeground }]}>CLUB</Text>
              </View>
              <Text style={[styles.cell, styles.headerText, { color: colors.mutedForeground }]}>MP</Text>
              <Text style={[styles.cell, styles.headerText, { color: colors.mutedForeground }]}>GD</Text>
              <Text style={[styles.cell, styles.pts, styles.headerText, { color: colors.mutedForeground }]}>PTS</Text>
            </View>

            {standings.map((row, index) => renderRow({ item: row, index }))}
            
            {standings.length === 0 && (
              <Text style={[styles.empty, { color: colors.mutedForeground }]}>No standings data available.</Text>
            )}
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:         { flex: 1 },

  leagueBar:         { paddingVertical: 16 },
  leagueBarContent:  { paddingHorizontal: 20, gap: 12 },
  leagueBtn:         { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  leagueBtnText:     { fontSize: 14, fontWeight: '600' },

  content:           { flex: 1, paddingHorizontal: 20 },
  tableCard:         { borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
  cardHeader:        { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle:         { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  cardSubtitle:      { fontSize: 10 },

  header:            { borderBottomWidth: 1 },
  headerText:        { fontWeight: '700', fontSize: 11, letterSpacing: 0.5 },
  row:               { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 14, position: 'relative' },
  statusIndicator:   { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, borderTopRightRadius: 2, borderBottomRightRadius: 2 },
  cell:              { width: 32, textAlign: 'center', fontSize: 13 },
  pos:               { width: 24, textAlign: 'left', fontWeight: '600' },
  teamCell:          { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 4 },
  logoWrapper:       { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  teamLogo:          { width: 16, height: 16 },
  fallbackLogo:      { fontSize: 12 },
  teamName:          { fontSize: 14, fontWeight: '700', flex: 1 },
  pts:               { fontWeight: '800', fontSize: 15, width: 40 },
  empty:             { textAlign: 'center', paddingVertical: 40, fontSize: 14 },
});
