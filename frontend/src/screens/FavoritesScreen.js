import React, { useCallback, useState } from 'react';
import {
  View, Text, Image, TouchableOpacity,
  StyleSheet, SectionList, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LEAGUES } from '../constants/leagues';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useFavorites } from '../hooks/useFavorites';
import { useTheme } from '../theme/ThemeContext';

export default function FavoritesScreen() {
  const { user } = useAuth();
  const { favorites, loading, refresh } = useFavorites();
  const { colors } = useTheme();
  const navigation = useNavigation();
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (user) refresh(); // silent background refresh — no spinner
    }, [user])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  if (!user) {
    return (
      <SafeAreaView edges={['bottom']} style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={[styles.center, { backgroundColor: colors.background }]}>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Sign in to see favorites</Text>
          <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
            Save teams, leagues, and players you follow.
          </Text>
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.accent }]}
            onPress={() => navigation.navigate('Auth')}
          >
            <Text style={styles.btnText}>Log In / Sign Up</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (loading && favorites.length === 0) {
    return (
      <SafeAreaView edges={['bottom']} style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={[styles.center, { backgroundColor: colors.background }]}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  const leagues = favorites.filter(f => f.type === 'league');
  const teams   = favorites.filter(f => f.type === 'team');
  const players = favorites.filter(f => f.type === 'player');
  const sections = [
    { title: 'Leagues', data: leagues },
    { title: 'Teams',   data: teams },
    { title: 'Players', data: players },
  ].filter(s => s.data.length > 0);

  if (sections.length === 0) {
    return (
      <SafeAreaView edges={['bottom']} style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={[styles.center, { backgroundColor: colors.background }]}>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No favorites yet</Text>
          <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
            Tap the heart icon on any team, league, or player to save it here.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  function handlePress(item) {
    if (item.type === 'team') {
      navigation.navigate('TeamDetail', {
        team: { team_id: item.external_id, team_name: item.name, team_logo: item.logo },
        leagueCode: null,
        leagueLabel: null,
      });
    } else if (item.type === 'league') {
      const knownLeague = LEAGUES.find(l => String(l.id) === String(item.external_id));
      navigation.navigate('LeagueDetail', {
        league: knownLeague
          ? { code: knownLeague.code, id: knownLeague.id, name: knownLeague.label, logo: knownLeague.logo }
          : { id: item.external_id, name: item.name, logo: item.logo },
      });
    } else if (item.type === 'player') {
      navigation.navigate('PlayerDetail', {
        playerId: item.external_id,
        playerName: item.name,
        playerPhoto: item.logo,
      });
    }
  }

  function renderItem({ item }) {
    return (
      <TouchableOpacity
        style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => handlePress(item)}
      >
        <View style={[styles.logoWrap, { backgroundColor: colors.muted }]}>
          {item.logo
            ? <Image source={{ uri: item.logo }} style={styles.logo} resizeMode="contain" />
            : <Text style={[styles.logoInitial, { color: colors.mutedForeground }]}>
                {item.name ? item.name.charAt(0).toUpperCase() : '?'}
              </Text>
          }
        </View>
        <Text style={[styles.name, { color: colors.foreground }]}>{item.name}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView edges={['bottom']} style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <Text style={[styles.screenTitle, { color: colors.foreground }]}>Favorites</Text>
      <SectionList
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={styles.list}
        sections={sections}
        keyExtractor={item => `${item.type}-${item.external_id}`}
        renderItem={renderItem}
        renderSectionHeader={({ section }) => (
          <Text style={[styles.sectionHeader, { color: colors.mutedForeground }]}>{section.title}</Text>
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea:      { flex: 1 },
  screenTitle:   { fontSize: 28, fontWeight: '800', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 },
  center:        { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 24 },
  emptyTitle:    { fontSize: 20, fontWeight: '700' },
  emptySub:      { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  btn:           { height: 46, paddingHorizontal: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnText:       { color: '#fff', fontWeight: '700' },
  list:          { padding: 16, gap: 8, paddingBottom: 100 },
  sectionHeader: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 16, marginBottom: 4 },
  row:           { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, borderWidth: 1 },
  logoWrap:      { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  logo:          { width: 30, height: 30 },
  logoInitial:   { fontSize: 16, fontWeight: '800' },
  name:          { fontSize: 15, fontWeight: '600', flex: 1 },
});
