import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, FlatList, Image, StyleSheet, RefreshControl, ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import api from '../services/api';
import ErrorState from '../components/ErrorState';
import { useTheme } from '../theme/ThemeContext';
import { hapticSelect } from '../utils/haptics';

export default function TopAssistsView({ leagueCode }) {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation();
  const [assists, setAssists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAssists = useCallback(async () => {
    setError(null);
    try {
      const { data } = await api.get(`/api/top-assists/${leagueCode}`);
      setAssists(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.response?.data?.detail ?? 'Failed to load top assists.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [leagueCode]);

  useEffect(() => { fetchAssists(); }, [leagueCode]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAssists();
  }, [fetchAssists]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (error) return <ErrorState message={error} onRetry={fetchAssists} />;

  const renderItem = ({ item, index }) => (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => { hapticSelect(); item.id && navigation.push('PlayerDetail', {
        playerId: item.id, playerName: item.name, playerPhoto: item.photo,
      }); }}
      style={[
        styles.row,
        {
          backgroundColor: index % 2 === 0 ? 'transparent' : (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'),
          borderBottomColor: colors.border,
        },
      ]}
    >
      <Text style={[styles.rank, { color: index < 3 ? colors.accent : colors.mutedForeground }]}>
        {index + 1}
      </Text>
      <View style={[styles.photoWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
        {item.photo
          ? <Image source={{ uri: item.photo }} style={styles.photo} />
          : <Ionicons name="person" size={16} color={colors.mutedForeground} />}
      </View>
      <View style={styles.info}>
        <Text style={[styles.playerName, { color: colors.foreground }]} numberOfLines={1}>
          {item.name}
        </Text>
        <View style={styles.teamRow}>
          {item.team_logo && <Image source={{ uri: item.team_logo }} style={styles.teamLogo} />}
          <Text style={[styles.teamName, { color: colors.mutedForeground }]} numberOfLines={1}>
            {item.team_name}
          </Text>
        </View>
      </View>
      <View style={styles.statsCol}>
        <Text style={[styles.mainStat, { color: colors.foreground }]}>{item.assists}</Text>
        <Text style={[styles.statsLabel, { color: colors.mutedForeground }]}>assists</Text>
      </View>
      <View style={styles.statsCol}>
        <Text style={[styles.secondaryStat, { color: colors.mutedForeground }]}>{item.goals}</Text>
        <Text style={[styles.statsLabel, { color: colors.mutedForeground }]}>goals</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <FlatList
      data={assists}
      keyExtractor={(item, i) => item.id?.toString() ?? `${i}`}
      renderItem={renderItem}
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      ListHeaderComponent={
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.headerRank, { color: colors.mutedForeground }]}>#</Text>
          <Text style={[styles.headerPlayer, { color: colors.mutedForeground }]}>PLAYER</Text>
          <Text style={[styles.headerStat, { color: colors.mutedForeground }]}>A</Text>
          <Text style={[styles.headerStat, { color: colors.mutedForeground }]}>G</Text>
        </View>
      }
      ListEmptyComponent={
        <View style={styles.emptyWrap}>
          <Ionicons name="football-outline" size={40} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No top assists data available.</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  center:        { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:          { paddingBottom: 40 },

  header:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 },
  headerRank:    { width: 28, fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  headerPlayer:  { flex: 1, fontSize: 11, fontWeight: '700', letterSpacing: 0.5, paddingLeft: 40 },
  headerStat:    { width: 40, textAlign: 'center', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },

  row:           { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  rank:          { width: 28, fontSize: 14, fontWeight: '800' },
  photoWrap:     { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  photo:         { width: 32, height: 32, borderRadius: 16 },
  info:          { flex: 1, paddingLeft: 10, gap: 2 },
  playerName:    { fontSize: 14, fontWeight: '700' },
  teamRow:       { flexDirection: 'row', alignItems: 'center', gap: 4 },
  teamLogo:      { width: 12, height: 12 },
  teamName:      { fontSize: 11, fontWeight: '500' },
  statsCol:      { width: 40, alignItems: 'center' },
  mainStat:      { fontSize: 16, fontWeight: '900' },
  secondaryStat: { fontSize: 14, fontWeight: '600' },
  statsLabel:    { fontSize: 9, fontWeight: '600' },

  emptyWrap:     { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 12 },
  emptyText:     { fontSize: 14, fontWeight: '600' },
});
