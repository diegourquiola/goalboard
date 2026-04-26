import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, Image, ScrollView, StyleSheet, ActivityIndicator,
  RefreshControl, TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import { BlurView } from 'expo-blur';
import { useTheme } from '../theme/ThemeContext';
import { hapticSelect, hapticSuccess } from '../utils/haptics';
import { useAuth } from '../context/AuthContext';
import { useFavorites } from '../hooks/useFavorites';
import AuthGate from '../components/AuthGate';
import { LEAGUES } from '../constants/leagues';

function formatFixtureDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d)) return '';
  return (
    d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    + ' · '
    + d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  );
}

function StatChip({ label, value, sub, colors }) {
  return (
    <View style={[styles.statChip, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.chipLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.chipVal, { color: colors.foreground }]}>{value}</Text>
      {sub ? <Text style={[styles.chipSub, { color: colors.mutedForeground }]}>{sub}</Text> : null}
    </View>
  );
}

const POSITION_ORDER = { Goalkeeper: 0, Defender: 1, Midfielder: 2, Attacker: 3 };
const POSITION_SHORT = { Goalkeeper: 'GK', Defender: 'DEF', Midfielder: 'MID', Attacker: 'FWD' };

export default function TeamDetailScreen({ route, navigation }) {
  const { team: routeTeam, leagueCode: routeLeagueCode, leagueLabel: routeLeagueLabel } = route.params;
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const { isFavorited, toggleFavorite } = useFavorites();

  const teamId = routeTeam.team_id ?? routeTeam.id;
  const hasStats = routeTeam.games_played != null;

  const [leagueCode, setLeagueCode]   = useState(routeLeagueCode ?? null);
  const [leagueLabel, setLeagueLabel] = useState(routeLeagueLabel ?? null);

  const [team, setTeam]   = useState(routeTeam);
  const [nextFixture, setNextFixture] = useState(null);
  const [lastFixtures, setLastFixtures] = useState([]);
  const [squad, setSquad] = useState([]);
  const [loadingNext, setLoadingNext] = useState(true);
  const [loadingLast, setLoadingLast] = useState(true);
  const [loadingSquad, setLoadingSquad] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [teamInfo, setTeamInfo]   = useState(null);
  const [transfers, setTransfers] = useState([]);
  const [loadingTeamInfo, setLoadingTeamInfo] = useState(true);
  const [loadingTransfers, setLoadingTransfers] = useState(true);
  const [showAuthGate, setShowAuthGate] = useState(false);

  const favorited = isFavorited('team', teamId);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => {
            if (!user) { setShowAuthGate(true); return; }
            toggleFavorite({
              type: 'team',
              externalId: teamId,
              name: team?.team_name ?? routeTeam.team_name ?? '',
              logo: team?.team_logo ?? routeTeam.team_logo ?? null,
            });
          }}
          style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center', marginRight: 4 }}
        >
          <Ionicons
            name={favorited ? 'heart' : 'heart-outline'}
            size={24}
            color={favorited ? '#EF4444' : colors.foreground}
          />
        </TouchableOpacity>
      ),
    });
  }, [favorited, user, team, toggleFavorite]);

  const fetchData = useCallback(() => {
    setLoadingNext(true);
    setLoadingLast(true);
    setLoadingSquad(true);

    if (!hasStats && leagueCode) {
      api.get(`/api/standings/${leagueCode}`)
        .then(r => {
          const rows = r.data?.stage?.[0]?.standings ?? [];
          const found = rows.find(row => row.team_id === teamId);
          if (found) setTeam(prev => ({ ...prev, ...found }));
        })
        .catch(() => {});
    } else if (!hasStats && !leagueCode) {
      // Discover which league this team belongs to (skip CL — domestic leagues only)
      LEAGUES.filter(({ code }) => code !== 'CL').forEach(({ code, label }) => {
        api.get(`/api/standings/${code}`)
          .then(r => {
            const rows = r.data?.stage?.[0]?.standings ?? [];
            const found = rows.find(row => row.team_id === teamId);
            if (found) {
              setTeam(prev => ({ ...prev, ...found }));
              setLeagueCode(code);
              setLeagueLabel(label);
            }
          })
          .catch(() => {});
      });
    }

    api.get(`/api/teams/${teamId}/next`)
      .then(r => setNextFixture(Object.keys(r.data).length > 0 ? r.data : null))
      .catch(() => setNextFixture(null))
      .finally(() => setLoadingNext(false));

    api.get(`/api/teams/${teamId}/last-fixtures`, { params: { last: 5 } })
      .then(r => setLastFixtures(Array.isArray(r.data) ? r.data : []))
      .catch(() => setLastFixtures([]))
      .finally(() => setLoadingLast(false));

    api.get(`/api/squad/${teamId}`)
      .then(r => setSquad(Array.isArray(r.data) ? r.data : []))
      .catch(() => setSquad([]))
      .finally(() => setLoadingSquad(false));

    setLoadingTeamInfo(true);
    setLoadingTransfers(true);

    api.get(`/api/teams/PL/${teamId}`)
      .then(r => {
        const venue = r.data?.venue;
        setTeamInfo(venue ? { venue_name: venue.name, venue_city: venue.city, venue_capacity: venue.capacity, venue_surface: venue.surface } : null);
      })
      .catch(() => setTeamInfo(null))
      .finally(() => setLoadingTeamInfo(false));

    api.get(`/api/teams/${teamId}/transfers`)
      .then(r => setTransfers(Array.isArray(r.data) ? r.data : []))
      .catch(() => setTransfers([]))
      .finally(() => setLoadingTransfers(false));
  }, [teamId, routeLeagueCode, hasStats]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
    setTimeout(() => { setRefreshing(false); hapticSuccess(); }, 1500);
  }, [fetchData]);

  const gp = team.games_played || 0;
  const w = team.wins || 0;
  const d = team.draws || 0;
  const l = team.losses || 0;
  const gf = team.goals_for || 0;
  const ga = team.goals_against || 0;
  const pts = team.points || 0;
  const avgGoals = gp > 0 ? (gf / gp).toFixed(1) : '0.0';
  const winPct = gp > 0 ? Math.round((w / gp) * 100) : 0;

  const groupedSquad = squad.reduce((acc, p) => {
    const pos = p.position || 'Unknown';
    if (!acc[pos]) acc[pos] = [];
    acc[pos].push(p);
    return acc;
  }, {});

  const sortedPositions = Object.keys(groupedSquad).sort(
    (a, b) => (POSITION_ORDER[a] ?? 99) - (POSITION_ORDER[b] ?? 99)
  );

  const getResult = (fixture) => {
    const homeId = fixture.teams?.home?.id;
    const hScore = fixture.score?.home;
    const aScore = fixture.score?.away;
    if (hScore == null || aScore == null) return null;
    if (hScore === aScore) return 'D';
    const isHome = homeId === teamId;
    return (isHome ? hScore > aScore : aScore > hScore) ? 'W' : 'L';
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
    >
      {/* Header */}
      <BlurView
        tint={isDark ? 'systemThinMaterialDark' : 'systemThinMaterialLight'}
        intensity={60}
        style={[styles.headerCard, { borderColor: colors.border, overflow: 'hidden' }]}
      >
        <View style={[styles.logoCircle, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
          {team.team_logo
            ? <Image source={{ uri: team.team_logo }} style={styles.headerLogo} />
            : <Text style={{ fontSize: 32 }}>⚽</Text>}
        </View>
        <Text style={[styles.headerName, { color: colors.foreground }]}>{team.team_name}</Text>
        <View style={styles.headerMeta}>
          {team.position != null && (
            <View style={[styles.positionBadge, { backgroundColor: colors.accent + '1A' }]}>
              <Text style={[styles.positionText, { color: colors.accent }]}>#{team.position} in league</Text>
            </View>
          )}
          {leagueLabel && (
            <Text style={[styles.leagueName, { color: colors.mutedForeground }]}>{leagueLabel}</Text>
          )}
        </View>
      </BlurView>

      {/* Season Stats */}
      {gp > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>SEASON STATS</Text>
          <View style={styles.statGrid}>
            <StatChip label="Points" value={pts} sub={`${gp} games`} colors={colors} />
            <StatChip label="Win %" value={`${winPct}%`} sub={`${w}W ${d}D ${l}L`} colors={colors} />
            <StatChip label="Goals" value={gf} sub={`${avgGoals} avg`} colors={colors} />
          </View>
          <View style={styles.statGrid}>
            <StatChip label="Conceded" value={ga} sub={gp > 0 ? `${(ga / gp).toFixed(1)} avg` : '–'} colors={colors} />
            <StatChip label="GD" value={team.goal_difference > 0 ? `+${team.goal_difference}` : `${team.goal_difference}`} colors={colors} />
            <StatChip label="Played" value={gp} colors={colors} />
          </View>
        </View>
      )}

      {/* Next Fixture */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>NEXT MATCH</Text>
        {loadingNext ? (
          <ActivityIndicator size="small" color={colors.accent} style={{ paddingVertical: 12 }} />
        ) : nextFixture ? (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => { hapticSelect(); navigation.navigate('MatchDetail', { match: nextFixture, leagueCode }); }}
            style={[styles.fixtureCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <View style={styles.fixtureRow}>
              <View style={styles.fixtureTeam}>
                <View style={[styles.fixtureLogoWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                  {nextFixture.teams?.home?.logo && <Image source={{ uri: nextFixture.teams.home.logo }} style={styles.fixtureLogo} />}
                </View>
                <Text style={[styles.fixtureTeamName, { color: colors.foreground }]} numberOfLines={1}>
                  {nextFixture.teams?.home?.name}
                </Text>
              </View>
              <Text style={[styles.fixtureVs, { color: colors.mutedForeground }]}>VS</Text>
              <View style={[styles.fixtureTeam, { alignItems: 'flex-end' }]}>
                <Text style={[styles.fixtureTeamName, { color: colors.foreground, textAlign: 'right' }]} numberOfLines={1}>
                  {nextFixture.teams?.away?.name}
                </Text>
                <View style={[styles.fixtureLogoWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                  {nextFixture.teams?.away?.logo && <Image source={{ uri: nextFixture.teams.away.logo }} style={styles.fixtureLogo} />}
                </View>
              </View>
            </View>
            <View style={styles.fixtureFooter}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fixtureDate, { color: colors.mutedForeground }]}>
                  {formatFixtureDate(nextFixture.date)}
                </Text>
                {nextFixture.venue?.name && (
                  <Text style={[styles.fixtureVenue, { color: colors.mutedForeground }]}>{nextFixture.venue.name}</Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
            </View>
          </TouchableOpacity>
        ) : (
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No upcoming fixtures.</Text>
        )}
      </View>

      {/* Recent Results */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>RECENT RESULTS</Text>
        {loadingLast ? (
          <ActivityIndicator size="small" color={colors.accent} style={{ paddingVertical: 12 }} />
        ) : lastFixtures.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No recent results.</Text>
        ) : (
          <View style={[styles.resultsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {lastFixtures.map((f, i) => {
              const result = getResult(f);
              const resultColor = result === 'W' ? colors.chartGreen : result === 'D' ? colors.mutedForeground : colors.destructive;
              return (
                <TouchableOpacity
                  key={f.id ?? i}
                  activeOpacity={0.7}
                  onPress={() => { hapticSelect(); navigation.push('MatchDetail', { match: f, leagueCode }); }}
                  style={[styles.resultRow, { borderBottomColor: colors.border, borderBottomWidth: i === lastFixtures.length - 1 ? 0 : 1 }]}
                >
                  {result && (
                    <View style={[styles.resultBadge, { backgroundColor: resultColor }]}>
                      <Text style={styles.resultBadgeText}>{result}</Text>
                    </View>
                  )}
                  <View style={styles.resultTeams}>
                    <Text style={[styles.resultTeamText, { color: colors.foreground }]} numberOfLines={1}>
                      {f.teams?.home?.name ?? '–'}
                    </Text>
                    <Text style={[styles.resultScore, { color: colors.foreground }]}>
                      {f.score?.home ?? '–'} - {f.score?.away ?? '–'}
                    </Text>
                    <Text style={[styles.resultTeamText, { color: colors.foreground, textAlign: 'right' }]} numberOfLines={1}>
                      {f.teams?.away?.name ?? '–'}
                    </Text>
                  </View>
                  <Text style={[styles.resultDate, { color: colors.mutedForeground }]}>
                    {f.date ? new Date(f.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                  </Text>
                  <Ionicons name="chevron-forward" size={12} color={colors.mutedForeground} />
                </TouchableOpacity>
              );
            })}
          </View>
        )}
        <TouchableOpacity
          style={[styles.seeAllBtn, { borderColor: colors.border }]}
          activeOpacity={0.7}
          onPress={() => { hapticSelect(); navigation.push('TeamFixtures', { teamId, teamName: team.team_name, leagueCode }); }}
        >
          <Text style={[styles.seeAllText, { color: colors.mutedForeground }]}>See all season fixtures</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      {/* Squad */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>SQUAD</Text>
        {loadingSquad ? (
          <ActivityIndicator size="small" color={colors.accent} style={{ paddingVertical: 12 }} />
        ) : squad.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No squad data available.</Text>
        ) : (
          <View style={[styles.squadCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {sortedPositions.map((pos, pi) => (
              <View key={pos}>
                <View style={[styles.posHeader, pi > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}>
                  <Text style={[styles.posLabel, { color: colors.accent }]}>
                    {POSITION_SHORT[pos] ?? pos.toUpperCase()}
                  </Text>
                </View>
                {groupedSquad[pos].map((p, i) => (
                  <TouchableOpacity
                    key={p.id ?? i}
                    activeOpacity={0.7}
                    onPress={() => { hapticSelect(); p.id && navigation.push('PlayerDetail', {
                      playerId: p.id, playerName: p.name, playerPhoto: p.photo,
                    }); }}
                    style={[
                      styles.playerRow,
                      {
                        borderBottomWidth: (i === groupedSquad[pos].length - 1 && pi === sortedPositions.length - 1) ? 0 : 1,
                        borderBottomColor: colors.border,
                        backgroundColor: i % 2 === 0 ? 'transparent' : (isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)'),
                      },
                    ]}
                  >
                    <Text style={[styles.playerNum, { color: colors.mutedForeground }]}>
                      {p.number ?? '–'}
                    </Text>
                    <View style={[styles.playerPhotoWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                      {p.photo
                        ? <Image source={{ uri: p.photo }} style={styles.playerPhoto} />
                        : <Ionicons name="person" size={14} color={colors.mutedForeground} />}
                    </View>
                    <View style={styles.playerInfo}>
                      <Text style={[styles.playerName, { color: colors.foreground }]} numberOfLines={1}>{p.name}</Text>
                      {p.age != null && (
                        <Text style={[styles.playerAge, { color: colors.mutedForeground }]}>Age {p.age}</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Venue */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>VENUE</Text>
        {loadingTeamInfo ? (
          <ActivityIndicator size="small" color={colors.accent} style={{ paddingVertical: 12 }} />
        ) : !teamInfo ? (
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No venue data available.</Text>
        ) : (
          <View style={[styles.venueCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.venueInfo}>
              <Text style={[styles.venueName, { color: colors.foreground }]}>{teamInfo.venue_name}</Text>
              {teamInfo.venue_city && (
                <Text style={[styles.venueSub, { color: colors.mutedForeground }]}>{teamInfo.venue_city}</Text>
              )}
              <View style={styles.venueChips}>
                {teamInfo.venue_capacity && (
                  <View style={[styles.venueChip, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                    <Ionicons name="people" size={12} color={colors.mutedForeground} />
                    <Text style={[styles.venueChipText, { color: colors.mutedForeground }]}>
                      {Number(teamInfo.venue_capacity).toLocaleString()}
                    </Text>
                  </View>
                )}
                {teamInfo.venue_surface && (
                  <View style={[styles.venueChip, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                    <Text style={[styles.venueChipText, { color: colors.mutedForeground }]}>{teamInfo.venue_surface}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        )}
      </View>

      {/* Recent Transfers */}
      {transfers.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>RECENT TRANSFERS</Text>
          <View style={[styles.squadCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {transfers.slice(0, 10).map((t, i) => (
              <View
                key={`transfer-${i}`}
                style={[styles.transferRow, {
                  borderBottomWidth: i === Math.min(transfers.length, 10) - 1 ? 0 : 1,
                  borderBottomColor: colors.border,
                }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.transferPlayer, { color: colors.foreground }]} numberOfLines={1}>{t.player_name}</Text>
                  <View style={styles.transferTeams}>
                    {t.team_out?.logo && <Image source={{ uri: t.team_out.logo }} style={styles.transferLogo} />}
                    <Text style={[styles.transferTeamText, { color: colors.mutedForeground }]} numberOfLines={1}>{t.team_out?.name ?? '–'}</Text>
                    <Ionicons name="arrow-forward" size={12} color={colors.mutedForeground} />
                    {t.team_in?.logo && <Image source={{ uri: t.team_in.logo }} style={styles.transferLogo} />}
                    <Text style={[styles.transferTeamText, { color: colors.foreground }]} numberOfLines={1}>{t.team_in?.name ?? '–'}</Text>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  {t.transfer_date && (
                    <Text style={[styles.transferDate, { color: colors.mutedForeground }]}>
                      {new Date(t.transfer_date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
                    </Text>
                  )}
                  {t.type && t.type !== 'N/A' && (
                    <Text style={[styles.transferType, { color: colors.accent }]}>{t.type}</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={{ height: 40 }} />
      <AuthGate visible={showAuthGate} onClose={() => setShowAuthGate(false)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1 },

  headerCard:    { margin: 20, borderRadius: 24, borderWidth: 1, padding: 24, alignItems: 'center', gap: 12 },
  logoCircle:    { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  headerLogo:    { width: 52, height: 52 },
  headerName:    { fontSize: 20, fontWeight: '900' },
  headerMeta:    { flexDirection: 'row', alignItems: 'center', gap: 12 },
  positionBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  positionText:  { fontSize: 12, fontWeight: '800' },
  leagueName:    { fontSize: 12, fontWeight: '600' },

  section:       { paddingHorizontal: 20, marginBottom: 24 },
  sectionTitle:  { fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 12 },

  statGrid:      { flexDirection: 'row', gap: 12, marginBottom: 12 },
  statChip:      { flex: 1, padding: 12, borderRadius: 20, borderWidth: 1, minHeight: 80, justifyContent: 'space-between' },
  chipLabel:     { fontSize: 10, fontWeight: '700' },
  chipVal:       { fontSize: 20, fontWeight: '900' },
  chipSub:       { fontSize: 9, fontWeight: '700' },

  fixtureCard:   { borderRadius: 20, borderWidth: 1, padding: 16, gap: 10 },
  fixtureRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  fixtureTeam:   { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  fixtureLogoWrap:{ width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  fixtureLogo:   { width: 20, height: 20 },
  fixtureTeamName:{ fontSize: 13, fontWeight: '700', flex: 1 },
  fixtureVs:     { fontSize: 12, fontWeight: '800', marginHorizontal: 8 },
  fixtureFooter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  fixtureDate:   { fontSize: 12, fontWeight: '600' },
  fixtureVenue:  { fontSize: 11, fontWeight: '500', marginTop: 2 },

  resultsCard:   { borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
  resultRow:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12, gap: 10 },
  resultBadge:   { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  resultBadgeText:{ color: '#fff', fontSize: 10, fontWeight: '800' },
  resultTeams:   { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  resultTeamText:{ flex: 1, fontSize: 12, fontWeight: '600' },
  resultScore:   { fontSize: 14, fontWeight: '800', minWidth: 40, textAlign: 'center' },
  resultDate:    { fontSize: 10, fontWeight: '600', width: 44 },

  seeAllBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10, paddingVertical: 12, borderRadius: 14, borderWidth: 1 },
  seeAllText:    { fontSize: 13, fontWeight: '600' },

  emptyText:     { fontSize: 13, fontWeight: '600' },

  squadCard:     { borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
  posHeader:     { paddingHorizontal: 14, paddingVertical: 8 },
  posLabel:      { fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  playerRow:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10 },
  playerNum:     { width: 24, fontSize: 12, fontWeight: '700', textAlign: 'center' },
  playerPhotoWrap: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginHorizontal: 8 },
  playerPhoto:   { width: 24, height: 24, borderRadius: 12 },
  playerInfo:    { flex: 1, gap: 2 },
  playerName:    { fontSize: 13, fontWeight: '700' },
  playerAge:     { fontSize: 10, fontWeight: '600' },

  venueCard:      { borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
  venueInfo:      { padding: 16, gap: 4 },
  venueName:      { fontSize: 15, fontWeight: '800' },
  venueSub:       { fontSize: 12, fontWeight: '500' },
  venueChips:     { flexDirection: 'row', gap: 8, marginTop: 8 },
  venueChip:      { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  venueChipText:  { fontSize: 11, fontWeight: '600' },
  transferRow:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  transferPlayer: { fontSize: 13, fontWeight: '700' },
  transferTeams:  { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  transferLogo:   { width: 14, height: 14 },
  transferTeamText:{ fontSize: 11, fontWeight: '500', maxWidth: 90 },
  transferDate:   { fontSize: 10, fontWeight: '600' },
  transferType:   { fontSize: 9, fontWeight: '700', marginTop: 2 },
});
