import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, Image, ScrollView, StyleSheet, ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import ErrorState from '../components/ErrorState';
import { BlurView } from 'expo-blur';
import { useTheme } from '../theme/ThemeContext';
import { hapticSuccess } from '../utils/haptics';
import { TouchableOpacity } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useFavorites } from '../hooks/useFavorites';
import AuthGate from '../components/AuthGate';

function InfoChip({ label, value, colors }) {
  if (!value) return null;
  return (
    <View style={[styles.infoChip, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: colors.foreground }]}>{value}</Text>
    </View>
  );
}

function StatCell({ label, value, colors, accent }) {
  return (
    <View style={styles.statCell}>
      <Text style={[styles.statValue, { color: accent ? colors.accent : colors.foreground }]}>
        {value ?? '–'}
      </Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

export default function PlayerDetailScreen({ route, navigation }) {
  const { playerId, playerName, playerPhoto } = route.params;
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const { isFavorited, toggleFavorite } = useFavorites();

  const [player, setPlayer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
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

  const photo = player?.photo ?? playerPhoto;
  const name = player?.name ?? playerName;
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

  if (error) return <ErrorState message={error} onRetry={fetchPlayer} />;
  if (!player) return null;

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
          <InfoChip label="Age" value={player.age} colors={colors} />
          <InfoChip label="Height" value={player.height} colors={colors} />
          <InfoChip label="Weight" value={player.weight} colors={colors} />
        </View>

        {player.birth?.date && (
          <Text style={[styles.birthInfo, { color: colors.mutedForeground }]}>
            Born {player.birth.date}
            {player.birth.place ? ` in ${player.birth.place}` : ''}
            {player.birth.country ? `, ${player.birth.country}` : ''}
          </Text>
        )}
      </BlurView>

      {/* Season Statistics */}
      {(player.statistics ?? []).length === 0 ? (
        <View style={styles.section}>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No season statistics available.</Text>
        </View>
      ) : (
        player.statistics.map((stat, idx) => {
          const g = stat.games || {};
          const goals = stat.goals || {};
          const shots = stat.shots || {};
          const passes = stat.passes || {};
          const tackles = stat.tackles || {};
          const dribbles = stat.dribbles || {};
          const duels = stat.duels || {};
          const cards = stat.cards || {};
          const penalty = stat.penalty || {};

          const rating = g.rating ? parseFloat(g.rating).toFixed(2) : null;

          return (
            <View key={idx} style={styles.section}>
              {/* League header */}
              <View style={[styles.leagueHeader, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.leagueInfo}>
                  {stat.league?.logo && (
                    <Image source={{ uri: stat.league.logo }} style={styles.leagueLogo} />
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.leagueName, { color: colors.foreground }]}>
                      {stat.league?.name ?? 'Unknown'}
                    </Text>
                    {stat.league?.country && (
                      <Text style={[styles.leagueCountry, { color: colors.mutedForeground }]}>
                        {stat.league.country} · {stat.league.season}
                      </Text>
                    )}
                  </View>
                </View>
                {stat.team?.logo && (
                  <View style={styles.teamInfo}>
                    <Image source={{ uri: stat.team.logo }} style={styles.teamLogo} />
                    <Text style={[styles.teamName, { color: colors.mutedForeground }]} numberOfLines={1}>
                      {stat.team.name}
                    </Text>
                  </View>
                )}
              </View>

              {/* Key Stats */}
              <View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.statsRow}>
                  <StatCell label="Apps" value={g.appearances} colors={colors} />
                  <StatCell label="Goals" value={goals.total} colors={colors} accent />
                  <StatCell label="Assists" value={goals.assists} colors={colors} accent />
                  <StatCell label="Rating" value={rating} colors={colors} />
                </View>

                <View style={[styles.statsDivider, { backgroundColor: colors.border }]} />

                <View style={styles.statsRow}>
                  <StatCell label="Minutes" value={g.minutes} colors={colors} />
                  <StatCell label="Lineups" value={g.lineups} colors={colors} />
                  <StatCell label="Shots" value={shots.total} colors={colors} />
                  <StatCell label="On Target" value={shots.on} colors={colors} />
                </View>

                <View style={[styles.statsDivider, { backgroundColor: colors.border }]} />

                <View style={styles.statsRow}>
                  <StatCell label="Passes" value={passes.total} colors={colors} />
                  <StatCell label="Key Pass" value={passes.key} colors={colors} />
                  <StatCell label="Accuracy" value={passes.accuracy ? `${passes.accuracy}%` : null} colors={colors} />
                  <StatCell label="Tackles" value={tackles.total} colors={colors} />
                </View>

                <View style={[styles.statsDivider, { backgroundColor: colors.border }]} />

                <View style={styles.statsRow}>
                  <StatCell label="Dribbles" value={dribbles.success} colors={colors} />
                  <StatCell
                    label="Duels Won"
                    value={duels.won != null && duels.total ? `${Math.round((duels.won / duels.total) * 100)}%` : null}
                    colors={colors}
                  />
                  <StatCell label="Yellow" value={cards.yellow} colors={colors} />
                  <StatCell label="Red" value={cards.red} colors={colors} />
                </View>

                {(penalty.scored != null || penalty.missed != null) && (
                  <>
                    <View style={[styles.statsDivider, { backgroundColor: colors.border }]} />
                    <View style={styles.statsRow}>
                      <StatCell label="Pen Scored" value={penalty.scored} colors={colors} />
                      <StatCell label="Pen Missed" value={penalty.missed} colors={colors} />
                      <StatCell label="Fouls Drawn" value={stat.fouls?.drawn} colors={colors} />
                      <StatCell label="Fouls" value={stat.fouls?.committed} colors={colors} />
                    </View>
                  </>
                )}
              </View>
            </View>
          );
        })
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

  headerCard: {
    margin: 20, borderRadius: 24, borderWidth: 1, padding: 24,
    alignItems: 'center', gap: 8,
  },
  photoWrap: {
    width: 88, height: 88, borderRadius: 44,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  photo: { width: 84, height: 84, borderRadius: 42 },
  playerName: { fontSize: 20, fontWeight: '900', textAlign: 'center' },
  nationality: { fontSize: 13, fontWeight: '600' },
  posBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 },
  posText: { fontSize: 12, fontWeight: '800' },
  injuredBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
  },
  injuredText: { fontSize: 11, fontWeight: '800' },
  infoRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  infoChip: {
    flex: 1, padding: 10, borderRadius: 16, borderWidth: 1,
    alignItems: 'center', gap: 2,
  },
  infoLabel: { fontSize: 9, fontWeight: '700' },
  infoValue: { fontSize: 15, fontWeight: '900' },
  birthInfo: { fontSize: 11, fontWeight: '500', textAlign: 'center', marginTop: 4 },

  section: { paddingHorizontal: 20, marginBottom: 20 },
  emptyText: { fontSize: 13, fontWeight: '600', textAlign: 'center', paddingVertical: 20 },

  leagueHeader: {
    borderRadius: 20, borderWidth: 1, padding: 14, marginBottom: 10, gap: 10,
  },
  leagueInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  leagueLogo: { width: 24, height: 24 },
  leagueName: { fontSize: 14, fontWeight: '800' },
  leagueCountry: { fontSize: 11, fontWeight: '600' },
  teamInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  teamLogo: { width: 18, height: 18 },
  teamName: { fontSize: 12, fontWeight: '600' },

  statsCard: { borderRadius: 20, borderWidth: 1, padding: 14, gap: 10 },
  statsRow: { flexDirection: 'row' },
  statsDivider: { height: 1 },
  statCell: { flex: 1, alignItems: 'center', paddingVertical: 6 },
  statValue: { fontSize: 16, fontWeight: '900' },
  statLabel: { fontSize: 9, fontWeight: '700', marginTop: 2, textAlign: 'center' },
});
