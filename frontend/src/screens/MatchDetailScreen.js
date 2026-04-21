import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, Image, ScrollView, StyleSheet, ActivityIndicator, RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { LEAGUES } from '../constants/leagues';
import { BlurView } from 'expo-blur';
import PitchFormation from '../components/PitchFormation';
import api from '../services/api';
import { hapticSelect, hapticSuccess } from '../utils/haptics';

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

export default function MatchDetailScreen({ route }) {
  const { match, leagueCode } = route.params;
  const { colors, isDark } = useTheme();
  const navigation = useNavigation();
  const leagueLabel = LEAGUES.find(l => l.code === leagueCode)?.label ?? '';

  const homeId    = match.teams?.home?.id;
  const awayId    = match.teams?.away?.id;
  const fixtureId = match.id;

  const navigateToTeam = (teamObj, standingsRow) => {
    hapticSelect();
    const team = standingsRow ?? {
      team_id: teamObj.id,
      team_name: teamObj.name,
      team_logo: teamObj.logo,
    };
    navigation.push('TeamDetail', { team, leagueCode, leagueLabel });
  };

  const [standings, setStandings] = useState([]);
  const [h2h,       setH2h]       = useState([]);
  const [homeForm,  setHomeForm]  = useState([]);
  const [awayForm,  setAwayForm]  = useState([]);
  const [lineups,   setLineups]   = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const [loading, setLoading] = useState({
    standings: true, h2h: true, form: true, lineups: true,
  });

  const fetchAll = useCallback(() => {
    setLoading({ standings: true, h2h: true, form: true, lineups: true });

    api.get(`/api/standings/${leagueCode}`)
      .then(r => setStandings(r.data?.stage?.[0]?.standings ?? []))
      .catch(() => setStandings([]))
      .finally(() => setLoading(p => ({ ...p, standings: false })));

    api.get(`/api/h2h/${homeId}/${awayId}`)
      .then(r => setH2h(Array.isArray(r.data) ? r.data : []))
      .catch(() => setH2h([]))
      .finally(() => setLoading(p => ({ ...p, h2h: false })));

    Promise.all([
      api.get(`/api/teams/${homeId}/last-fixtures`).then(r => setHomeForm(Array.isArray(r.data) ? r.data : [])).catch(() => setHomeForm([])),
      api.get(`/api/teams/${awayId}/last-fixtures`).then(r => setAwayForm(Array.isArray(r.data) ? r.data : [])).catch(() => setAwayForm([])),
    ]).finally(() => setLoading(p => ({ ...p, form: false })));

    api.get(`/api/fixtures/${fixtureId}/lineups`)
      .then(r => setLineups(Array.isArray(r.data) ? r.data : []))
      .catch(() => setLineups([]))
      .finally(() => setLoading(p => ({ ...p, lineups: false })));
  }, [leagueCode, homeId, awayId, fixtureId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    fetchAll();
    setTimeout(() => { setRefreshing(false); hapticSuccess(); }, 1500);
  }, [fetchAll]);

  const isFinished = (match.status ?? '').toLowerCase() === 'finished';
  const isLive     = (match.status ?? '').toLowerCase() === 'live';
  const stats      = match.stats;
  const hasStats   = stats && Object.keys(stats).length > 0;

  const homeFormBadges = homeForm.slice(0, 5).map(f => getResultFromFixture(f, homeId)).filter(Boolean);
  const awayFormBadges = awayForm.slice(0, 5).map(f => getResultFromFixture(f, awayId)).filter(Boolean);

  const homeLineup = lineups?.find(l => l.team_id === homeId) ?? null;
  const awayLineup = lineups?.find(l => l.team_id === awayId) ?? null;

  return (
    <ScrollView
      style={[s.container, { backgroundColor: colors.background }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
    >
      {/* Match Header */}
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
            <View style={[s.teamLogoWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
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
                LIVE {match.minute ? `${match.minute}'` : ''}
              </Text>
            )}
          </View>

          <TouchableOpacity
            style={[s.teamCol, s.teamColRight]}
            activeOpacity={0.7}
            onPress={() => match.teams?.away && navigateToTeam(match.teams.away, standings.find(r => r.team_id === awayId))}
          >
            <View style={[s.teamLogoWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
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

      {/* Match Stats */}
      {hasStats && (
        <View style={s.section}>
          <SectionTitle label="MATCH STATS" colors={colors} />
          <View style={[s.statsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {stats.possession_home != null && (
              <StatBar label="POSSESSION" home={stats.possession_home} away={stats.possession_away} colors={colors} isDark={isDark} />
            )}
            {stats.shots_home != null && (
              <StatBar label="SHOTS ON TARGET" home={stats.shots_home} away={stats.shots_away} colors={colors} isDark={isDark} />
            )}
            {stats.corners_home != null && (
              <StatBar label="CORNERS" home={stats.corners_home} away={stats.corners_away} colors={colors} isDark={isDark} />
            )}
            {stats.passes_home != null && (
              <StatBar label="PASSES" home={stats.passes_home} away={stats.passes_away} colors={colors} isDark={isDark} />
            )}
            {stats.fouls_home != null && (
              <StatBar label="FOULS" home={stats.fouls_home} away={stats.fouls_away} colors={colors} isDark={isDark} />
            )}
          </View>
        </View>
      )}

      {/* League Table (both teams only) */}
      <View style={s.section}>
        <SectionTitle label="LEAGUE TABLE" colors={colors} />
        {loading.standings ? <InlineSpinner colors={colors} /> : (() => {
          const teamRows = standings.filter(row => row.team_id === homeId || row.team_id === awayId);
          return (
            <View style={[s.tableCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {teamRows.length === 0 ? (
                <Text style={[s.empty, { color: colors.mutedForeground }]}>No standings data.</Text>
              ) : teamRows.map((row, i) => (
                <TouchableOpacity
                  key={row.team_name ?? i}
                  activeOpacity={0.7}
                  onPress={() => navigateToTeam({ id: row.team_id, name: row.team_name, logo: row.team_logo }, row)}
                  style={[
                    s.tableRow,
                    {
                      backgroundColor: colors.accent + '1A',
                      borderBottomColor: colors.border,
                      borderBottomWidth: i === teamRows.length - 1 ? 0 : 1,
                    },
                  ]}
                >
                  <Text style={[s.tablePos, { color: colors.accent }]}>
                    {row.position}
                  </Text>
                  <View style={[s.tableLogoWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                    {row.team_logo
                      ? <Image source={{ uri: row.team_logo }} style={s.tableTeamLogo} />
                      : <Text style={{ fontSize: 8 }}>⚽</Text>}
                  </View>
                  <Text style={[s.tableTeam, { color: colors.accent }]} numberOfLines={1}>
                    {row.team_name}
                  </Text>
                  <Text style={[s.tableCell, { color: colors.mutedForeground }]}>{row.games_played}</Text>
                  <Text style={[s.tableCell, { color: colors.mutedForeground }]}>
                    {row.goal_difference > 0 ? `+${row.goal_difference}` : row.goal_difference}
                  </Text>
                  <Text style={[s.tablePts, { color: colors.accent }]}>
                    {row.points}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          );
        })()}
      </View>

      {/* Head to Head */}
      <View style={s.section}>
        <SectionTitle label="HEAD TO HEAD" colors={colors} />
        {loading.h2h ? <InlineSpinner colors={colors} /> : h2h.length === 0 ? (
          <Text style={[s.empty, { color: colors.mutedForeground }]}>No previous meetings found.</Text>
        ) : (
          <View style={[s.tableCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {h2h.map((m, i) => {
              const hScore = m.score?.home ?? '–';
              const aScore = m.score?.away ?? '–';
              const hWin   = m.score?.home != null && m.score.home > m.score.away;
              const aWin   = m.score?.away != null && m.score.away > m.score.home;
              return (
                <View
                  key={m.id ?? i}
                  style={[s.h2hRow, { borderBottomColor: colors.border, borderBottomWidth: i === h2h.length - 1 ? 0 : 1 }]}
                >
                  <Text style={[s.h2hDate, { color: colors.mutedForeground }]}>
                    {m.date ? new Date(m.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) : '–'}
                  </Text>
                  <Text
                    style={[s.h2hTeam, { color: hWin ? colors.foreground : colors.mutedForeground, fontWeight: hWin ? '800' : '500' }]}
                    numberOfLines={1}
                  >
                    {m.teams?.home?.name ?? '–'}
                  </Text>
                  <Text style={[s.h2hScore, { color: colors.foreground }]}>
                    {hScore} – {aScore}
                  </Text>
                  <Text
                    style={[s.h2hTeam, { color: aWin ? colors.foreground : colors.mutedForeground, fontWeight: aWin ? '800' : '500', textAlign: 'right' }]}
                    numberOfLines={1}
                  >
                    {m.teams?.away?.name ?? '–'}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* Recent Form */}
      <View style={s.section}>
        <SectionTitle label="RECENT FORM" colors={colors} />
        {loading.form ? <InlineSpinner colors={colors} /> : (
          <View style={[s.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={s.formRow}>
              <Text style={[s.formTeamLabel, { color: colors.foreground }]} numberOfLines={1}>
                {match.teams?.home?.name}
              </Text>
              <View style={s.formBadges}>
                {homeFormBadges.length > 0
                  ? homeFormBadges.map((r, i) => <FormBadge key={i} result={r} colors={colors} />)
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
                  ? awayFormBadges.map((r, i) => <FormBadge key={i} result={r} colors={colors} />)
                  : <Text style={[s.formNone, { color: colors.mutedForeground }]}>No data</Text>}
              </View>
            </View>
          </View>
        )}
      </View>

      {/* Lineups */}
      <View style={s.section}>
        <SectionTitle label="LINEUPS" colors={colors} />
        {loading.lineups ? <InlineSpinner colors={colors} /> : (!homeLineup && !awayLineup) ? (
          <Text style={[s.empty, { color: colors.mutedForeground }]}>Lineups not yet available.</Text>
        ) : (
          <>
            {/* Pitch formation visuals */}
            {[homeLineup, awayLineup].filter(Boolean).map((lineup) => (
              <PitchFormation
                key={`pitch-${lineup.team_id}`}
                players={lineup.players ?? []}
                formation={lineup.formation}
                teamName={lineup.team_name}
                isDark={isDark}
                onPlayerPress={(p) => { hapticSelect(); navigation.push('PlayerDetail', {
                  playerId: p.id, playerName: p.name, playerPhoto: p.photo,
                }); }}
              />
            ))}

            {/* Substitutes only (starting XI shown on pitch above) */}
            {[homeLineup, awayLineup].filter(Boolean).map((lineup) => (
              (lineup.substitutes ?? []).length > 0 && (
                <View key={`subs-${lineup.team_id}`} style={[s.lineupSection, { backgroundColor: colors.card, borderColor: colors.border, marginBottom: 16 }]}>
                  <View style={[s.lineupHeader, { borderBottomColor: colors.border }]}>
                    <View style={[s.lineupLogoWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
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
                        onPress={() => { hapticSelect(); player.id && navigation.push('PlayerDetail', {
                          playerId: player.id, playerName: player.name, playerPhoto: player.photo,
                        }); }}
                        style={[
                          s.playerRow,
                          {
                            borderBottomWidth: i === lineup.substitutes.length - 1 ? 0 : 1,
                            borderBottomColor: colors.border,
                            backgroundColor: i % 2 === 0 ? 'transparent' : (isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)'),
                          },
                        ]}
                      >
                        <Text style={[s.playerNum, { color: colors.mutedForeground }]}>
                          {player.number ?? '–'}
                        </Text>
                        <View style={[s.playerPhotoWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                          {player.photo
                            ? <Image source={{ uri: player.photo }} style={s.playerPhoto} />
                            : <View style={s.playerPhotoPlaceholder} />}
                        </View>
                        <Text style={[s.playerName, { color: colors.foreground }]} numberOfLines={1}>
                          {player.name}
                        </Text>
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

      <View style={{ height: 40 }} />
    </ScrollView>
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
  playerPos:          { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, width: 28, textAlign: 'right' },
});
