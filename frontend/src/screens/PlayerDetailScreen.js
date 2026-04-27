import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, Image, ScrollView, StyleSheet, ActivityIndicator,
  RefreshControl, TouchableOpacity, LayoutAnimation, Platform, UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import ErrorState from '../components/ErrorState';
import { BlurView } from 'expo-blur';
import { useTheme } from '../theme/ThemeContext';
import { hapticSuccess, hapticLight } from '../utils/haptics';
import { useAuth } from '../context/AuthContext';
import { useFavorites } from '../hooks/useFavorites';
import AuthGate from '../components/AuthGate';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function InfoChip({ label, value, colors }) {
  if (!value) return null;
  return (
    <View style={[styles.infoChip, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: colors.foreground }]}>{value}</Text>
    </View>
  );
}

function KeyStatChip({ label, value, colors, highlight }) {
  return (
    <View style={[styles.keyChip, { backgroundColor: colors.card, borderColor: highlight ? colors.accent + '40' : colors.border }]}>
      <Text style={[styles.keyChipVal, { color: highlight ? colors.accent : colors.foreground }]}>
        {value ?? '–'}
      </Text>
      <Text style={[styles.keyChipLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}


function StatGroup({ title, rows, colors }) {
  const visibleRows = rows.filter(r => r.value != null && r.value !== '–' && r.value !== null);
  if (visibleRows.length === 0) return null;
  return (
    <View style={styles.statGroup}>
      <Text style={[styles.statGroupTitle, { color: colors.mutedForeground }]}>{title}</Text>
      <View style={[styles.statGroupCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {visibleRows.map((row, i) => (
          <View
            key={row.label}
            style={[
              styles.statRow,
              { borderBottomColor: colors.border, borderBottomWidth: i === visibleRows.length - 1 ? 0 : 1 },
            ]}
          >
            <Text style={[styles.statRowLabel, { color: colors.mutedForeground }]}>{row.label}</Text>
            <Text style={[styles.statRowValue, { color: colors.foreground }]}>{row.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// Domestic leagues come first; cups and international competitions go last.
function competitionSortKey(leagueName) {
  const name = (leagueName ?? '').toLowerCase();
  const friendly = ['friendl'];
  const intl     = ['champions', 'europa', 'conference', 'world', 'nations', 'uefa', 'fifa'];
  const cup      = ['cup', 'copa', 'coupe', 'pokal', 'coppa', 'taca', 'trofeo', 'supercopa', 'supercoupe'];
  if (friendly.some(k => name.includes(k))) return 3;
  if (intl.some(k => name.includes(k)))     return 2;
  if (cup.some(k => name.includes(k)))      return 1;
  return 0;
}

function CompetitionBlock({ stat, defaultOpen, colors }) {
  const [open, setOpen] = useState(defaultOpen);

  const g        = stat.games    || {};
  const goals    = stat.goals    || {};
  const shots    = stat.shots    || {};
  const passes   = stat.passes   || {};
  const tackles  = stat.tackles  || {};
  const dribbles = stat.dribbles || {};
  const duels    = stat.duels    || {};
  const cards    = stat.cards    || {};
  const penalty  = stat.penalty  || {};
  const fouls    = stat.fouls    || {};

  const rating   = g.rating ? parseFloat(g.rating).toFixed(1) : null;
  const duelPct  = duels.won != null && duels.total ? `${Math.round((duels.won / duels.total) * 100)}%` : null;
  const passPct  = passes.accuracy != null ? `${passes.accuracy}%` : null;

  function toggle() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    hapticLight();
    setOpen(o => !o);
  }

  return (
    <View style={styles.competitionBlock}>
      {/* Dropdown header */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={toggle}
        style={[styles.competitionHeader, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <View style={styles.competitionHeaderLeft}>
          {stat.league?.logo && (
            <Image source={{ uri: stat.league.logo }} style={styles.leagueLogo} />
          )}
          <View style={{ flex: 1 }}>
            <Text style={[styles.leagueName, { color: colors.foreground }]} numberOfLines={1}>
              {stat.league?.name ?? 'Unknown'}
            </Text>
            <Text style={[styles.leagueSub, { color: colors.mutedForeground }]}>
              {[stat.league?.country, stat.league?.season].filter(Boolean).join(' · ')}
              {stat.team?.name ? `  ·  ${stat.team.name}` : ''}
            </Text>
          </View>
        </View>
        <View style={styles.competitionHeaderRight}>
          {stat.team?.logo && (
            <Image source={{ uri: stat.team.logo }} style={styles.teamLogo} />
          )}
          <Ionicons
            name={open ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={colors.mutedForeground}
          />
        </View>
      </TouchableOpacity>

      {open && (
        <View style={styles.competitionContent}>
          {/* Key stats */}
          <View style={styles.keyChipsRow}>
            <KeyStatChip label="Goals"   value={goals.total}    colors={colors} highlight />
            <KeyStatChip label="Assists" value={goals.assists}  colors={colors} highlight />
            <KeyStatChip label="Apps"    value={g.appearances}  colors={colors} />
            <KeyStatChip label="Rating"  value={rating}         colors={colors} />
          </View>

          <StatGroup title="ATTACK" colors={colors} rows={[
            { label: 'Minutes played',  value: g.minutes },
            { label: 'Lineups',         value: g.lineups },
            { label: 'Shots total',     value: shots.total },
            { label: 'Shots on target', value: shots.on },
            { label: 'Penalties scored', value: penalty.scored },
            { label: 'Penalties missed', value: penalty.missed },
          ]} />

          <StatGroup title="PASSING" colors={colors} rows={[
            { label: 'Passes',       value: passes.total },
            { label: 'Key passes',   value: passes.key },
            { label: 'Pass accuracy', value: passPct },
          ]} />

          <StatGroup title="DEFENSE" colors={colors} rows={[
            { label: 'Tackles',       value: tackles.total },
            { label: 'Blocks',        value: tackles.blocks },
            { label: 'Interceptions', value: tackles.interceptions },
            { label: 'Dribbles won',  value: dribbles.success },
            { label: 'Duels won',     value: duelPct },
          ]} />

          <StatGroup title="DISCIPLINE" colors={colors} rows={[
            { label: 'Yellow cards', value: cards.yellow },
            { label: 'Red cards',    value: cards.red },
            { label: 'Fouls drawn',  value: fouls.drawn },
            { label: 'Fouls committed', value: fouls.committed },
          ]} />
        </View>
      )}
    </View>
  );
}

export default function PlayerDetailScreen({ route, navigation }) {
  const { playerId, playerName, playerPhoto } = route.params;
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const { isFavorited, toggleFavorite } = useFavorites();

  const [player,       setPlayer]       = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [refreshing,   setRefreshing]   = useState(false);
  const [showAuthGate, setShowAuthGate] = useState(false);

  const favorited = isFavorited('player', playerId);

  const fetchPlayer = useCallback(async () => {
    setError(null);
    try {
      const { data } = await api.get(`/api/players/${playerId}`);
      setPlayer(data);
    } catch (e) {
      setError(e.response?.data?.detail ?? 'Failed to load player.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [playerId]);

  useEffect(() => { fetchPlayer(); }, [fetchPlayer]);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => {
            if (!user) { setShowAuthGate(true); return; }
            toggleFavorite({
              type: 'player',
              externalId: playerId,
              name: player?.name ?? playerName ?? '',
              logo: player?.photo ?? playerPhoto ?? null,
            });
          }}
          style={{ marginRight: 8 }}
        >
          <Ionicons
            name={favorited ? 'heart' : 'heart-outline'}
            size={24}
            color={favorited ? '#EF4444' : colors.foreground}
          />
        </TouchableOpacity>
      ),
    });
  }, [favorited, user, player]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPlayer().then(() => hapticSuccess());
  }, [fetchPlayer]);

  const photo   = player?.photo ?? playerPhoto;
  const name    = player?.name  ?? playerName;
  const mainPos = player?.statistics?.[0]?.games?.position;

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <View style={styles.loadingHeader}>
          {photo && <Image source={{ uri: photo }} style={styles.loadingPhoto} />}
          <Text style={[styles.loadingName, { color: colors.foreground }]}>{name}</Text>
        </View>
        <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 24 }} />
      </View>
    );
  }

  if (error)   return <ErrorState message={error} onRetry={fetchPlayer} />;
  if (!player) return null;

  const sortedStats = [...(player.statistics ?? [])].sort(
    (a, b) => competitionSortKey(a.league?.name) - competitionSortKey(b.league?.name)
  );

  const sum = (key, sub) => {
    const vals = (player.statistics ?? []).map(s => s[key]?.[sub]).filter(v => v != null);
    return vals.length ? vals.reduce((a, b) => a + b, 0) : null;
  };
  const avgRating = (() => {
    const entries = (player.statistics ?? [])
      .map(s => ({ r: parseFloat(s.games?.rating), a: s.games?.appearances ?? 0 }))
      .filter(e => !isNaN(e.r) && e.a > 0);
    if (!entries.length) return null;
    const totalApps = entries.reduce((a, e) => a + e.a, 0);
    return (entries.reduce((a, e) => a + e.r * e.a, 0) / totalApps).toFixed(1);
  })();
  const totalDuelsWon   = sum('duels', 'won');
  const totalDuelsTotal = sum('duels', 'total');
  const duelPctTotal    = totalDuelsWon != null && totalDuelsTotal ? `${Math.round((totalDuelsWon / totalDuelsTotal) * 100)}%` : null;

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
        <View style={[styles.photoWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
          {photo
            ? <Image source={{ uri: photo }} style={styles.photo} />
            : <Ionicons name="person" size={40} color={colors.mutedForeground} />}
        </View>

        <Text style={[styles.playerName, { color: colors.foreground }]}>
          {player.firstname} {player.lastname}
        </Text>

        {player.nationality && (
          <Text style={[styles.nationality, { color: colors.mutedForeground }]}>
            {player.nationality}
          </Text>
        )}

        {mainPos && (
          <View style={[styles.posBadge, { backgroundColor: colors.accent + '1A' }]}>
            <Text style={[styles.posText, { color: colors.accent }]}>{mainPos}</Text>
          </View>
        )}

        {player.injured && (
          <View style={[styles.injuredBadge, { backgroundColor: colors.destructive + '1A' }]}>
            <Ionicons name="medkit" size={12} color={colors.destructive} />
            <Text style={[styles.injuredText, { color: colors.destructive }]}>Injured</Text>
          </View>
        )}

        <View style={styles.infoRow}>
          <InfoChip label="Age"    value={player.age} colors={colors} />
          <InfoChip label="Height" value={player.height ? String(player.height).replace(/\s*cm$/i, '') + ' cm' : null} colors={colors} />
          <InfoChip label="Weight" value={player.weight ? String(player.weight).replace(/\s*kg$/i, '') + ' kg' : null} colors={colors} />
        </View>

        {player.birth?.date && (
          <Text style={[styles.birthInfo, { color: colors.mutedForeground }]}>
            Born {player.birth.date}
            {player.birth.place   ? ` in ${player.birth.place}`   : ''}
            {player.birth.country ? `, ${player.birth.country}`    : ''}
          </Text>
        )}
      </BlurView>

      {sortedStats.length === 0 ? (
        <View style={styles.section}>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No season statistics available.</Text>
        </View>
      ) : (
        <>
          {/* Season totals */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>SEASON STATS</Text>
            <View style={styles.keyChipsRow}>
              <KeyStatChip label="Goals"   value={sum('goals', 'total')}   colors={colors} highlight />
              <KeyStatChip label="Assists" value={sum('goals', 'assists')} colors={colors} highlight />
              <KeyStatChip label="Apps"    value={sum('games', 'appearances')} colors={colors} />
              <KeyStatChip label="Rating"  value={avgRating}               colors={colors} />
            </View>
            <View style={styles.seasonGroups}>
              <StatGroup title="ATTACK" colors={colors} rows={[
                { label: 'Minutes played',   value: sum('games', 'minutes') },
                { label: 'Shots total',      value: sum('shots', 'total') },
                { label: 'Shots on target',  value: sum('shots', 'on') },
                { label: 'Penalties scored', value: sum('penalty', 'scored') },
                { label: 'Penalties missed', value: sum('penalty', 'missed') },
              ]} />
              <StatGroup title="PASSING" colors={colors} rows={[
                { label: 'Passes',      value: sum('passes', 'total') },
                { label: 'Key passes',  value: sum('passes', 'key') },
              ]} />
              <StatGroup title="DEFENSE" colors={colors} rows={[
                { label: 'Tackles',       value: sum('tackles', 'total') },
                { label: 'Blocks',        value: sum('tackles', 'blocks') },
                { label: 'Interceptions', value: sum('tackles', 'interceptions') },
                { label: 'Dribbles won',  value: sum('dribbles', 'success') },
                { label: 'Duels won',     value: duelPctTotal },
              ]} />
              <StatGroup title="DISCIPLINE" colors={colors} rows={[
                { label: 'Yellow cards',     value: sum('cards', 'yellow') },
                { label: 'Red cards',        value: sum('cards', 'red') },
                { label: 'Fouls drawn',      value: sum('fouls', 'drawn') },
                { label: 'Fouls committed',  value: sum('fouls', 'committed') },
              ]} />
            </View>
          </View>

          {/* Per-competition breakdown */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>STATS BY COMPETITION</Text>
            {sortedStats.map((stat, idx) => (
              <CompetitionBlock
                key={idx}
                stat={stat}
                defaultOpen={false}
                colors={colors}
              />
            ))}
          </View>
        </>
      )}

      <View style={{ height: 40 }} />
      <AuthGate visible={showAuthGate} onClose={() => setShowAuthGate(false)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center' },

  loadingHeader: { alignItems: 'center', gap: 12 },
  loadingPhoto:  { width: 64, height: 64, borderRadius: 32 },
  loadingName:   { fontSize: 16, fontWeight: '800' },

  headerCard: { margin: 20, borderRadius: 24, borderWidth: 1, padding: 24, alignItems: 'center', gap: 8 },
  photoWrap:  { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  photo:      { width: 84, height: 84, borderRadius: 42 },

  playerName:   { fontSize: 20, fontWeight: '900', textAlign: 'center' },
  nationality:  { fontSize: 13, fontWeight: '600' },
  posBadge:     { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 },
  posText:      { fontSize: 12, fontWeight: '800' },
  injuredBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  injuredText:  { fontSize: 11, fontWeight: '800' },
  infoRow:      { flexDirection: 'row', gap: 10, marginTop: 8 },
  infoChip:     { flex: 1, padding: 10, borderRadius: 16, borderWidth: 1, alignItems: 'center', gap: 2 },
  infoLabel:    { fontSize: 9, fontWeight: '700' },
  infoValue:    { fontSize: 15, fontWeight: '900' },
  birthInfo:    { fontSize: 11, fontWeight: '500', textAlign: 'center', marginTop: 4 },

  section:       { paddingHorizontal: 20, paddingBottom: 20 },
  seasonGroups:  { gap: 12, marginTop: 12 },
  sectionTitle:  { fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 14 },
  emptyText:  { fontSize: 13, fontWeight: '600', textAlign: 'center', paddingVertical: 20 },

  competitionBlock:  { marginBottom: 12 },
  competitionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 16, borderWidth: 1, padding: 14 },
  competitionHeaderLeft:  { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  competitionHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  leagueLogo: { width: 24, height: 24 },
  leagueName: { fontSize: 14, fontWeight: '800' },
  leagueSub:  { fontSize: 11, fontWeight: '600', marginTop: 1 },
  teamLogo:   { width: 18, height: 18 },

  competitionContent: { marginTop: 8, gap: 12 },

  keyChipsRow: { flexDirection: 'row', gap: 10 },
  keyChip:     { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 16, borderWidth: 1, gap: 4 },
  keyChipVal:  { fontSize: 20, fontWeight: '900' },
  keyChipLabel:{ fontSize: 9, fontWeight: '700' },

  statGroup:     { gap: 6 },
  statGroupTitle:{ fontSize: 9, fontWeight: '800', letterSpacing: 0.8, paddingLeft: 4 },
  statGroupCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  statRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 11 },
  statRowLabel:  { fontSize: 13, fontWeight: '600' },
  statRowValue:  { fontSize: 13, fontWeight: '800' },
});
