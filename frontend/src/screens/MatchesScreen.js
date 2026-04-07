import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  ScrollView, StyleSheet, Keyboard,
} from 'react-native';
import api from '../services/api';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import { isValidDate, isDateRangeValid } from '../utils/validation';

const LEAGUES = [
  { code: 'PL',  label: 'Premier League' },
  { code: 'PD',  label: 'La Liga' },
  { code: 'BL1', label: 'Bundesliga' },
  { code: 'SA',  label: 'Serie A' },
  { code: 'FL1', label: 'Ligue 1' },
  { code: 'CL',  label: 'Champions League' },
];

const STATUS_COLORS = {
  finished:    { bg: '#D1FAE5', text: '#065F46' },
  'pre-match': { bg: '#DBEAFE', text: '#1E40AF' },
  live:        { bg: '#FEF3C7', text: '#92400E' },
};

function statusStyle(status = '') {
  return STATUS_COLORS[status.toLowerCase()] ?? { bg: '#F3F4F6', text: '#374151' };
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function MatchesScreen() {
  const [league, setLeague] = useState('PL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [dateError, setDateError] = useState('');
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  const fetchMatches = useCallback(async () => {
    Keyboard.dismiss();

    if (!isValidDate(dateFrom)) {
      setDateError('Enter a valid start date (YYYY-MM-DD).');
      return;
    }
    if (!isValidDate(dateTo)) {
      setDateError('Enter a valid end date (YYYY-MM-DD).');
      return;
    }
    if (!isDateRangeValid(dateFrom, dateTo)) {
      setDateError('Start date must be on or before end date.');
      return;
    }
    setDateError('');
    setLoading(true);
    setError(null);
    setHasSearched(true);
    try {
      const { data } = await api.get(`/api/matches/${league}`, {
        params: { date_from: dateFrom, date_to: dateTo },
      });
      // Response: array of { league_id, league_name, matches: [...] }
      const allMatches = (Array.isArray(data) ? data : [])
        .flatMap(group => group.matches ?? []);
      setMatches(allMatches);
    } catch (e) {
      setError(e.response?.data?.detail ?? 'Failed to load matches.');
    } finally {
      setLoading(false);
    }
  }, [league, dateFrom, dateTo]);

  const renderMatch = ({ item: match }) => {
    const home = match.teams?.home?.name ?? match.home_team ?? '–';
    const away = match.teams?.away?.name ?? match.away_team ?? '–';
    const scoreHome = match.score?.home ?? match.home_score;
    const scoreAway = match.score?.away ?? match.away_score;
    const hasScore = scoreHome != null && scoreAway != null;
    const status = match.status ?? '';
    const { bg, text } = statusStyle(status);

    return (
      <View style={styles.matchCard}>
        <View style={styles.matchMeta}>
          <Text style={styles.matchDate}>{formatDate(match.date ?? match.match_date)}</Text>
          <View style={[styles.statusBadge, { backgroundColor: bg }]}>
            <Text style={[styles.statusText, { color: text }]}>{status}</Text>
          </View>
        </View>
        <View style={styles.matchRow}>
          <Text style={[styles.teamName, styles.homeTeam]} numberOfLines={1}>{home}</Text>
          <Text style={styles.score}>
            {hasScore ? `${scoreHome}  –  ${scoreAway}` : 'vs'}
          </Text>
          <Text style={[styles.teamName, styles.awayTeam]} numberOfLines={1}>{away}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* League selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.leagueBar}
        contentContainerStyle={styles.leagueBarContent}
      >
        {LEAGUES.map(l => (
          <TouchableOpacity
            key={l.code}
            style={[styles.leagueBtn, league === l.code && styles.leagueBtnActive]}
            onPress={() => setLeague(l.code)}
          >
            <Text style={[styles.leagueBtnText, league === l.code && styles.leagueBtnTextActive]}>
              {l.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Date filter */}
      <View style={styles.filterBar}>
        <TextInput
          style={styles.dateInput}
          placeholder="From: YYYY-MM-DD"
          placeholderTextColor="#9CA3AF"
          value={dateFrom}
          onChangeText={setDateFrom}
          keyboardType="numbers-and-punctuation"
          maxLength={10}
        />
        <TextInput
          style={styles.dateInput}
          placeholder="To: YYYY-MM-DD"
          placeholderTextColor="#9CA3AF"
          value={dateTo}
          onChangeText={setDateTo}
          keyboardType="numbers-and-punctuation"
          maxLength={10}
        />
        <TouchableOpacity style={styles.applyBtn} onPress={fetchMatches}>
          <Text style={styles.applyBtnText}>Search</Text>
        </TouchableOpacity>
      </View>
      {!!dateError && <Text style={styles.dateError}>{dateError}</Text>}

      {/* Results */}
      {loading && <LoadingState />}
      {!loading && error && <ErrorState message={error} onRetry={fetchMatches} />}
      {!loading && !error && (
        <FlatList
          data={matches}
          keyExtractor={(item, index) => String(item.id ?? index)}
          renderItem={renderMatch}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            hasSearched
              ? <Text style={styles.empty}>No matches found for this period.</Text>
              : <Text style={styles.empty}>Enter a date range and tap Search.</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:            { flex: 1, backgroundColor: '#fff' },

  leagueBar:            { borderBottomWidth: 1, borderBottomColor: '#E5E7EB', flexGrow: 0 },
  leagueBarContent:     { paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', gap: 8 },
  leagueBtn:            { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: '#F3F4F6' },
  leagueBtnActive:      { backgroundColor: '#2563EB' },
  leagueBtnText:        { fontSize: 13, color: '#374151' },
  leagueBtnTextActive:  { color: '#fff', fontWeight: '600' },

  filterBar:            { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 8, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  dateInput:            { flex: 1, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, color: '#111827' },
  applyBtn:             { backgroundColor: '#2563EB', paddingHorizontal: 16, paddingVertical: 9, borderRadius: 8 },
  applyBtnText:         { color: '#fff', fontWeight: '600', fontSize: 13 },
  dateError:            { color: '#DC2626', fontSize: 12, paddingHorizontal: 12, paddingBottom: 8 },

  list:                 { padding: 12, gap: 10 },
  matchCard:            { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#E5E7EB' },
  matchMeta:            { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  matchDate:            { fontSize: 12, color: '#6B7280' },
  statusBadge:          { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  statusText:           { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  matchRow:             { flexDirection: 'row', alignItems: 'center' },
  teamName:             { flex: 1, fontSize: 14, fontWeight: '600', color: '#111827' },
  homeTeam:             { textAlign: 'right', paddingRight: 10 },
  awayTeam:             { textAlign: 'left', paddingLeft: 10 },
  score:                { fontSize: 16, fontWeight: '700', color: '#2563EB', minWidth: 70, textAlign: 'center' },
  empty:                { textAlign: 'center', marginTop: 40, color: '#9CA3AF', fontSize: 14 },
});
