import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, Image, ScrollView,
  TextInput, ActivityIndicator, StyleSheet, Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import api from '../services/api';
import { LEAGUES } from '../constants/leagues';
import { hapticSelect } from '../utils/haptics';

export default function LeaguesListScreen({ navigation }) {
  const onSelect = (league) => navigation.navigate('LeagueDetail', { league });
  const { colors, isDark } = useTheme();
  const [query, setQuery]         = useState('');
  const [results, setResults]     = useState([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef(null);
  const inputRef    = useRef(null);

  const handleSearch = useCallback((text) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (text.length < 2) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await api.get('/api/leagues/search', { params: { q: text } });
        setResults(Array.isArray(data) ? data : []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
  }, []);

  const clearSearch = useCallback(() => {
    setQuery('');
    setResults([]);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    inputRef.current?.blur();
  }, []);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      {/* Search bar */}
      <TouchableOpacity
        activeOpacity={1}
        onPress={() => inputRef.current?.focus()}
        style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <Ionicons name="search" size={18} color={colors.mutedForeground} style={styles.searchIcon} />
        <TextInput
          ref={inputRef}
          value={query}
          onChangeText={handleSearch}
          placeholder="Search all leagues..."
          placeholderTextColor={colors.mutedForeground}
          style={[styles.searchInput, { color: colors.foreground }]}
          returnKeyType="search"
          onSubmitEditing={Keyboard.dismiss}
        />
        {searching
          ? <ActivityIndicator size="small" color={colors.accent} style={styles.spinner} />
          : <TouchableOpacity onPress={clearSearch} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
        }
      </TouchableOpacity>

      {/* Search results */}
      {query.length >= 2 && (
        <ScrollView
          style={[styles.resultsList, { backgroundColor: colors.card, borderColor: colors.border, maxHeight: 300 }]}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
        >
          {results.length === 0 && !searching && (
            <Text style={[styles.noResults, { color: colors.mutedForeground, padding: 14 }]}>No leagues found.</Text>
          )}
          {results.map(item => (
            <TouchableOpacity
              key={item.id}
              style={[styles.resultRow, { borderBottomColor: colors.border }]}
              onPress={() => { hapticSelect(); clearSearch(); onSelect({ code: String(item.id), id: item.id, label: item.name, name: item.name, logo: item.logo }); }}
            >
              <View style={[styles.resultLogoWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.88)' : 'rgba(0,0,0,0.04)' }]}>
                {item.logo
                  ? <Image source={{ uri: item.logo }} style={styles.resultLogo} resizeMode="contain" />
                  : <Text style={{ fontSize: 16 }}>⚽</Text>}
              </View>
              <View style={styles.resultInfo}>
                <Text style={[styles.resultName, { color: colors.foreground }]}>{item.name}</Text>
                {item.country ? (
                  <Text style={[styles.resultCountry, { color: colors.mutedForeground }]}>{item.country}</Text>
                ) : null}
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Featured Competitions */}
      <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
        FEATURED COMPETITIONS
      </Text>
      <View style={styles.grid}>
        {LEAGUES.map(league => (
          <TouchableOpacity
            key={league.code}
            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
            activeOpacity={0.7}
            onPress={() => { hapticSelect(); onSelect(league); }}
          >
            <View style={[styles.logoCircle, { backgroundColor: isDark ? 'rgba(255,255,255,0.88)' : '#F6F8FA' }]}>
              <Image source={{ uri: league.logo }} style={styles.logo} resizeMode="contain" />
            </View>
            <Text style={[styles.cardLabel, { color: colors.foreground }]} numberOfLines={2}>
              {league.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1 },
  content:        { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
  sectionTitle:   { fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 20 },

  grid:           { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 24 },
  card:           { width: '47%', borderRadius: 24, borderWidth: 1, paddingVertical: 24, paddingHorizontal: 16, alignItems: 'center', gap: 16 },
  logoCircle:     { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  logo:           { width: 52, height: 52 },
  cardLabel:      { fontSize: 13, fontWeight: '700', textAlign: 'center', lineHeight: 18 },

  searchBar:      { flexDirection: 'row', alignItems: 'center', borderRadius: 16, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12 },
  searchIcon:     { marginRight: 8 },
  searchInput:    { flex: 1, fontSize: 15, fontWeight: '500' },
  spinner:        { marginLeft: 8 },

  resultsList:    { borderRadius: 16, borderWidth: 1, overflow: 'hidden', marginBottom: 16 },
  resultRow:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, gap: 12 },
  resultLogoWrap: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  resultLogo:     { width: 26, height: 26 },
  resultInfo:     { flex: 1 },
  resultName:     { fontSize: 14, fontWeight: '700' },
  resultCountry:  { fontSize: 12, fontWeight: '500', marginTop: 2 },

  noResults:      { textAlign: 'center', fontSize: 14 },
});
