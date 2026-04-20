import React, { useState, useEffect } from 'react';
import {
  View, Text, Image, ScrollView, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import api from '../services/api';

// ── helpers ───────────────────────────────────────────────────────────────────

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

// ── small components ──────────────────────────────────────────────────────────

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
    '#EF4444';
  return (
    <View style={[s.formBadge, { backgroundColor: bg }]}>
      <Text style={s.formBadgeText}>{result}</Text>
    </View>
  );
}

// ── MatchDetailScreen ─────────────────────────────────────────────────────────

export default function MatchDetailScreen({ route }) {
  const { match, leagueCode } = route.params;
  const { colors, isDark } = useTheme();

  const homeId    = match.teams?.home?.id;
  const awayId    = match.teams?.away?.id;
  const fixtureId = match.id;

  const [standings, setStandings] = useState([]);
  const [h2h,       setH2h]       = useState([]);
  const [homeForm,  setHomeForm]  = useState([]);
  const [awayForm,  setAwayForm]  = useState([]);
  const [lineups,   setLineups]   = useState(null); // null = loading, [] = no data

  const [loading, setLoading] = useState({
    standings: true,
    h2h:       true,
    form:      true,
    lineups:   true,
  });

  useEffect(() => {
    // standings
    api.get(`/api/standings/${leagueCode}`)
      .then(r => setStandings(r.data?.stage?.[0]?.standings ?? []))
      .catch(() => setStandings([]))
      .finally(() => setLoading(p => ({ ...p, standings: false })));

    // H2H
    api.get(`/api/h2h/${homeId}/${awayId}`)
      .then(r => setH2h(Array.isArray(r.data) ? r.data : []))
      .catch(() => setH2h([]))
      .finally(() => setLoading(p => ({ ...p, h2h: false })));

    // recent form — both teams in parallel
    Promise.all([
      api.get(`/api/teams/${homeId}/last-fixtures`).then(r => setHomeForm(Array.isArray(r.data) ? r.data : [])).catch(() => setHomeForm([])),
      api.get(`/api/teams/${awayId}/last-fixtures`).then(r => setAwayForm(Array.isArray(r.data) ? r.data : [])).catch(() => setAwayForm([])),
    ]).finally(() => setLoading(p => ({ ...p, form: false })));

    // lineups
    api.get(`/api/fixtures/${fixtureId}/lineups`)
      .then(r => setLineups(Array.isArray(r.data) ? r.data : []))
      .catch(() => setLineups([]))
      .finally(() => setLoading(p => ({ ...p, lineups: false })));
  }, []);

  const isFinished = (match.status ?? '').toLowerCase() === 'finished';
  const isLive     = (match.status ?? '').toLowerCase() === 'live';

  const homeFormBadges = homeForm.slice(0, 5).map(f => getResultFromFixture(f, homeId)).filter(Boolean);
  const awayFormBadges = awayForm.slice(0, 5).map(f => getResultFromFixture(f, awayId)).filter(Boolean);

  const homeLineup = lineups?.find(l => l.team_id === homeId) ?? null;
  const awayLineup = lineups?.find(l => l.team_id === awayId) ?? null;

  return (
    <ScrollView style={[s.container, { backgroundColor: colors.background }]}>

      {/* ── Match Header ── */}
      <View style={[s.headerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={s.teamsRow}>
          {/* Home */}
          <View style={s.teamCol}>
            <View style={[s.teamLogoWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
              {match.teams?.home?.logo
                ? <Image source={{ uri: match.teams.home.logo }} style={s.teamLogo} />
                : <Text style={s.emoji}>⚽</Text>}
            </View>
            <Text style={[s.teamName, { color: colors.foreground }]} numberOfLines={2}>
              {match.teams?.home?.name}
            </Text>
          </View>

          {/* Score or VS */}
          <View style={s.middleCol}>
            {isFinished || isLive ? (
              <Text style={[s.scoreText, { color: isLive ? colors.accent : colors.foreground }]}>
                {match.score?.home ?? '–'} – {match.score?.away ?? '–'}
              </Text>
            ) : (
              <Text style={[s.vsText, { color: colors.mutedForeground }]}>VS</Text>
            )}
            {isLive && (
              <Text style={s.liveLabel}>
                LIVE {match.minute ? `${match.minute}'` : ''}
              </Text>
            )}
          </View>

          {/* Away */}
          <View style={[s.teamCol, s.teamColRight]}>
            <View style={[s.teamLogoWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
              {match.teams?.away?.logo
                ? <Image source={{ uri: match.teams.away.logo }} style={s.teamLogo} />
                : <Text style={s.emoji}>⚽</Text>}
            </View>
            <Text style={[s.teamName, { color: colors.foreground }]} numberOfLines={2}>
              {match.teams?.away?.name}
            </Text>
          </View>
        </View>

        {/* Venue + datetime */}
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
      </View>

      {/* ── League Table ── */}
      <View style={s.section}>
        <SectionTitle label="LEAGUE TABLE" colors={colors} />
        {loading.standings ? <InlineSpinner colors={colors} /> : (
          <View style={[s.tableCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {standings.length === 0 ? (
              <Text style={[s.empty, { color: colors.mutedForeground }]}>No standings data.</Text>
            ) : standings.map((row, i) => {
              const hi = row.team_id === homeId || row.team_id === awayId;
              return (
                <View
                  key={row.team_name ?? i}
                  style={[
                    s.tableRow,
                    {
                      backgroundColor: hi
                        ? colors.accent + '1A'
                        : i % 2 === 0 ? 'transparent' : (isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)'),
                      borderBottomColor: colors.border,
                      borderBottomWidth: i === standings.length - 1 ? 0 : 1,
                    },
                  ]}
                >
                  <Text style={[s.tablePos, { color: hi ? colors.accent : colors.mutedForeground }]}>
                    {row.position}
                  </Text>
                  <View style={[s.tableLogoWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                    {row.team_logo
                      ? <Image source={{ uri: row.team_logo }} style={s.tableTeamLogo} />
                      : <Text style={{ fontSize: 8 }}>⚽</Text>}
                  </View>
                  <Text style={[s.tableTeam, { color: hi ? colors.accent : colors.foreground }]} numberOfLines={1}>
                    {row.team_name}
                  </Text>
                  <Text style={[s.tableCell, { color: colors.mutedForeground }]}>{row.games_played}</Text>
                  <Text style={[s.tableCell, { color: colors.mutedForeground }]}>
                    {row.goal_difference > 0 ? `+${row.goal_difference}` : row.goal_difference}
                  </Text>
                  <Text style={[s.tablePts, { color: hi ? colors.accent : colors.foreground }]}>
                    {row.points}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* ── Head to Head ── */}
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

      {/* ── Recent Form ── */}
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

      {/* ── Lineups ── */}
      <View style={s.section}>
        <SectionTitle label="LINEUPS" colors={colors} />
        {loading.lineups ? <InlineSpinner colors={colors} /> : (!homeLineup && !awayLineup) ? (
          <Text style={[s.empty, { color: colors.mutedForeground }]}>Lineups not yet available.</Text>
        ) : (
          <View style={[s.lineupsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={s.lineupsRow}>
              {/* Home XI */}
              <View style={s.lineupCol}>
                <Text style={[s.lineupTeam, { color: colors.foreground }]} numberOfLines={1}>
                  {homeLineup?.team_name ?? match.teams?.home?.name}
                </Text>
                {homeLineup?.formation ? (
                  <Text style={[s.formation, { color: colors.accent }]}>{homeLineup.formation}</Text>
                ) : null}
                {(homeLineup?.players ?? []).map((name, i) => (
                  <Text key={i} style={[s.player, { color: colors.mutedForeground }]}>{name}</Text>
                ))}
              </View>

              <View style={[s.lineupDivider, { backgroundColor: colors.border }]} />

              {/* Away XI */}
              <View style={[s.lineupCol, { alignItems: 'flex-end' }]}>
                <Text style={[s.lineupTeam, { color: colors.foreground, textAlign: 'right' }]} numberOfLines={1}>
                  {awayLineup?.team_name ?? match.teams?.away?.name}
                </Text>
                {awayLineup?.formation ? (
                  <Text style={[s.formation, { color: colors.accent, textAlign: 'right' }]}>{awayLineup.formation}</Text>
                ) : null}
                {(awayLineup?.players ?? []).map((name, i) => (
                  <Text key={i} style={[s.player, { color: colors.mutedForeground, textAlign: 'right' }]}>{name}</Text>
                ))}
              </View>
            </View>
          </View>
        )}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ── styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container:    { flex: 1 },
  section:      { paddingHorizontal: 20, marginBottom: 24 },
  sectionTitle: { fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 12 },
  empty:        { fontSize: 13, fontWeight: '600', paddingVertical: 8 },

  // header card
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
  liveLabel:    { fontSize: 10, fontWeight: '800', color: '#EF4444', marginTop: 4 },
  venue:        { fontSize: 12, fontWeight: '600', textAlign: 'center', marginBottom: 4 },
  kickoff:      { fontSize: 12, fontWeight: '600', textAlign: 'center' },

  // standings table
  tableCard:    { borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
  tableRow:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10 },
  tablePos:     { width: 22, fontSize: 12, fontWeight: '700' },
  tableLogoWrap:{ width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  tableTeamLogo:{ width: 14, height: 14 },
  tableTeam:    { flex: 1, fontSize: 13, fontWeight: '700' },
  tableCell:    { width: 28, textAlign: 'center', fontSize: 12 },
  tablePts:     { width: 36, textAlign: 'right', fontSize: 13, fontWeight: '800' },

  // H2H
  h2hRow:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12, gap: 8 },
  h2hDate:      { width: 52, fontSize: 10, fontWeight: '600' },
  h2hTeam:      { flex: 1, fontSize: 12 },
  h2hScore:     { fontSize: 14, fontWeight: '800', minWidth: 48, textAlign: 'center' },

  // form
  formCard:     { borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
  formRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, gap: 12 },
  formTeamLabel:{ flex: 1, fontSize: 13, fontWeight: '700' },
  formBadges:   { flexDirection: 'row', gap: 6 },
  formBadge:    { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  formBadgeText:{ color: '#fff', fontSize: 10, fontWeight: '800' },
  formNone:     { fontSize: 12, fontWeight: '600' },
  formDivider:  { height: 1, marginHorizontal: 16 },

  // lineups
  lineupsCard:  { borderRadius: 20, borderWidth: 1, padding: 16 },
  lineupsRow:   { flexDirection: 'row', gap: 12 },
  lineupCol:    { flex: 1, gap: 6 },
  lineupTeam:   { fontSize: 13, fontWeight: '800' },
  formation:    { fontSize: 11, fontWeight: '700' },
  player:       { fontSize: 12, fontWeight: '500' },
  lineupDivider:{ width: 1, marginVertical: 4 },
});
