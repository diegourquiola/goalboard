import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, Image, ScrollView,
  RefreshControl, StyleSheet, ActivityIndicator, useWindowDimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { TabView } from 'react-native-tab-view';
import api from '../services/api';
import ErrorState from '../components/ErrorState';
import AllMatchesView from './AllMatchesView';
import TopScorersView from './TopScorersView';
import { useTheme } from '../theme/ThemeContext';
import { LEAGUES, LEAGUE_ZONES } from '../constants/leagues';
import { hapticSelect, hapticLight, hapticSuccess } from '../utils/haptics';

const TABS_ROUTES = [
  { key: 'standings',  title: 'STANDINGS'   },
  { key: 'matches',    title: 'MATCHES'     },
  { key: 'topscorers', title: 'TOP SCORERS' },
];

function StandingsView({ leagueCode }) {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation();
  const leagueLabel = LEAGUES.find(l => l.code === leagueCode)?.label ?? '';
  const [standings, setStandings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const { data } = await api.get(`/api/standings/${leagueCode}`);
      setStandings(data?.stage?.[0]?.standings ?? []);
    } catch (e) {
      setError(e.response?.data?.detail ?? 'Failed to load standings.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [leagueCode]);

  useEffect(() => { fetchData(); }, [leagueCode]);

  const onRefresh = useCallback(async () => { setRefreshing(true); await fetchData(); hapticSuccess(); }, [fetchData]);

  const zones = LEAGUE_ZONES[leagueCode] ?? { clSpots: 4, relegationStart: 18 };

  const getIndicator = (pos) => {
    if (zones.clSpots > 0 && pos <= zones.clSpots) return colors.accent;
    if (zones.relegationStart && pos >= zones.relegationStart) return colors.destructive;
    return null;
  };

  if (loading) return <View style={[s.center, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={colors.accent} /></View>;
  if (error)   return <ErrorState message={error} onRetry={fetchData} />;

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
    >
      <View style={[s.tableCard, { backgroundColor: colors.card, borderColor: colors.border, marginHorizontal: 16, marginTop: 16 }]}>
        <View style={[s.row, s.headerRow, { borderBottomColor: colors.border }]}>
          <Text style={[s.cell, s.pos, s.headerText, { color: colors.mutedForeground }]}>#</Text>
          <View style={s.teamCell}><Text style={[s.headerText, { color: colors.mutedForeground }]}>CLUB</Text></View>
          <Text style={[s.cell, s.headerText, { color: colors.mutedForeground }]}>MP</Text>
          <Text style={[s.cell, s.headerText, { color: colors.mutedForeground }]}>GD</Text>
          <Text style={[s.cell, s.pts, s.headerText, { color: colors.mutedForeground }]}>PTS</Text>
        </View>

        {standings.map((row, index) => {
          const ind = getIndicator(row.position);
          return (
            <TouchableOpacity
              key={row.team_name ?? index}
              activeOpacity={0.7}
              onPress={() => { hapticSelect(); navigation.navigate('TeamDetail', { team: row, leagueCode, leagueLabel }); }}
              style={[
                s.row,
                {
                  backgroundColor: index % 2 === 0 ? 'transparent' : (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'),
                  borderBottomWidth: index === standings.length - 1 ? 0 : 1,
                  borderBottomColor: colors.border,
                },
              ]}
            >
              {ind && <View style={[s.indicator, { backgroundColor: ind }]} />}
              <Text style={[s.cell, s.pos, { color: colors.mutedForeground }]}>{row.position}</Text>
              <View style={s.teamCell}>
                <View style={[s.logoWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                  {row.team_logo
                    ? <Image source={{ uri: row.team_logo }} style={s.teamLogo} />
                    : <Text style={{ fontSize: 10 }}>⚽</Text>}
                </View>
                <Text style={[s.teamName, { color: colors.foreground }]} numberOfLines={1}>{row.team_name}</Text>
              </View>
              <Text style={[s.cell, { color: colors.mutedForeground }]}>{row.games_played}</Text>
              <Text style={[s.cell, { color: colors.mutedForeground }]}>
                {row.goal_difference > 0 ? `+${row.goal_difference}` : row.goal_difference}
              </Text>
              <Text style={[s.cell, s.pts, { color: colors.foreground }]}>{row.points}</Text>
            </TouchableOpacity>
          );
        })}

        {standings.length === 0 && (
          <Text style={[s.empty, { color: colors.mutedForeground }]}>No standings data.</Text>
        )}
      </View>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

export default function LeagueDetailScreen({ route }) {
  const league = route.params.league;
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState(0);
  const layout = useWindowDimensions();

  const renderScene = useCallback(({ route: r }) => {
    if (r.key === 'standings')  return <StandingsView leagueCode={league.code} />;
    if (r.key === 'matches')    return <AllMatchesView leagueCode={league.code} />;
    if (r.key === 'topscorers') return <TopScorersView leagueCode={league.code} />;
    return null;
  }, [league.code]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Tab bar */}
      <View style={[styles.tabBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {TABS_ROUTES.map((tab, i) => {
          const active = activeTab === i;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, active && { borderBottomColor: colors.accent, borderBottomWidth: 2 }]}
              onPress={() => { hapticLight(); setActiveTab(i); }}
            >
              <Text style={[styles.tabText, { color: active ? colors.accent : colors.mutedForeground }]}>
                {tab.title}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <TabView
        navigationState={{ index: activeTab, routes: TABS_ROUTES }}
        renderScene={renderScene}
        onIndexChange={setActiveTab}
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

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabBar:    { flexDirection: 'row', borderBottomWidth: 1 },
  tab:       { flex: 1, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabText:   { fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
});

const s = StyleSheet.create({
  center:     { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tableCard:  { borderRadius: 20, borderWidth: 1, overflow: 'hidden', marginBottom: 16 },
  headerRow:  { borderBottomWidth: 1 },
  headerText: { fontWeight: '700', fontSize: 11, letterSpacing: 0.5 },
  row:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 14, position: 'relative' },
  indicator:  { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, borderTopRightRadius: 2, borderBottomRightRadius: 2 },
  cell:       { width: 32, textAlign: 'center', fontSize: 13 },
  pos:        { width: 24, textAlign: 'left', fontWeight: '600' },
  pts:        { fontWeight: '800', fontSize: 15, width: 40 },
  teamCell:   { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 4 },
  logoWrap:   { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  teamLogo:   { width: 16, height: 16 },
  teamName:   { fontSize: 14, fontWeight: '700', flex: 1 },
  empty:      { textAlign: 'center', paddingVertical: 40, fontSize: 14 },
});
