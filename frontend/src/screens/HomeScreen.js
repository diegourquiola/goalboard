import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View, Text, Image, TouchableOpacity, ScrollView,
  StyleSheet, RefreshControl, Modal, Pressable, useWindowDimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import MatchBellIcon from '../components/MatchBellIcon';
import { useFavorites } from '../hooks/useFavorites';
import { useTheme } from '../theme/ThemeContext';
import { hapticSelect } from '../utils/haptics';

// ─── Date helpers ────────────────────────────────────────────────────────────

function toYMD(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function dayOffset(date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return Math.round((d - today) / 86400000);
}

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const DAY_ABBR   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function dateLabel(date) {
  const offset = dayOffset(date);
  if (offset === 0)  return 'Today';
  if (offset === -1) return 'Yesterday';
  if (offset === 1)  return 'Tomorrow';
  const dow = DAY_ABBR[date.getDay()];
  const mon = MONTH_ABBR[date.getMonth()];
  return `${dow} ${mon} ${date.getDate()}`;
}

function buildCalendarDays(year, month) {
  const firstDow    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return cells;
}

// ─── Live status label ────────────────────────────────────────────────────────

function liveStatusLabel(match) {
  const ss = match.status_short ?? '';
  if (ss === 'HT')  return 'HT';
  if (ss === 'ET')  return 'ET';
  if (ss === 'BT')  return 'BT';
  if (ss === 'P')   return 'PEN';
  const m = match.minute;
  if (!m) return 'LIVE';
  if (ss === '1H' && m > 45) return `45+${m - 45}'`;
  if (ss === '2H' && m > 90) return `90+${m - 90}'`;
  return `${m}'`;
}

// ─── Match row (same visual pattern as AllMatchesView) ───────────────────────

function MatchRow({ match, leagueCode }) {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation();

  const home     = match.teams?.home?.name ?? '–';
  const away     = match.teams?.away?.name ?? '–';
  const homeLogo = match.teams?.home?.logo;
  const awayLogo = match.teams?.away?.logo;
  const sHome    = match.score?.home;
  const sAway    = match.score?.away;
  const status   = (match.status ?? '').toLowerCase();
  const isLive     = status === 'live';
  const isFinished = status === 'finished';
  const isPending  = !isLive && !isFinished;
  const homeWin = isFinished && sHome != null && sAway != null && sHome > sAway;
  const awayWin = isFinished && sHome != null && sAway != null && sAway > sHome;

  function kickoffTime(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d)) return '';
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  const logoBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)';

  return (
    <TouchableOpacity
      style={[
        styles.matchRow,
        {
          borderBottomColor: colors.border,
          backgroundColor: isLive ? 'rgba(239,68,68,0.06)' : colors.background,
        },
      ]}
      activeOpacity={0.7}
      onPress={() => { hapticSelect(); navigation.navigate('MatchDetail', { match, leagueCode: leagueCode ?? null }); }}
    >
      <View style={styles.statusCol}>
        {isLive ? (
          <>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>{liveStatusLabel(match)}</Text>
          </>
        ) : isFinished ? (
          <Text style={[styles.statusText, { color: colors.mutedForeground }]}>FT</Text>
        ) : (
          <Text style={[styles.statusText, { color: colors.mutedForeground }]}>
            {kickoffTime(match.date)}
          </Text>
        )}
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <View style={styles.teamsCol}>
        <View style={styles.teamLine}>
          <View style={[styles.logoWrap, { backgroundColor: logoBg }]}>
            {homeLogo ? <Image source={{ uri: homeLogo }} style={styles.teamLogo} /> : <Text style={styles.emoji}>⚽</Text>}
          </View>
          <Text style={[styles.teamName, { color: colors.foreground }, homeWin && styles.winner]} numberOfLines={1}>{home}</Text>
          {!isPending && (
            <Text style={[styles.score, { color: isLive ? colors.accent : colors.foreground, fontWeight: homeWin ? '900' : '600' }]}>
              {sHome ?? '-'}
            </Text>
          )}
        </View>
        <View style={styles.teamLine}>
          <View style={[styles.logoWrap, { backgroundColor: logoBg }]}>
            {awayLogo ? <Image source={{ uri: awayLogo }} style={styles.teamLogo} /> : <Text style={styles.emoji}>⚽</Text>}
          </View>
          <Text style={[styles.teamName, { color: colors.foreground }, awayWin && styles.winner]} numberOfLines={1}>{away}</Text>
          {!isPending && (
            <Text style={[styles.score, { color: isLive ? colors.accent : colors.foreground, fontWeight: awayWin ? '900' : '600' }]}>
              {sAway ?? '-'}
            </Text>
          )}
        </View>
      </View>

      <MatchBellIcon match={match} size={18} style={styles.bellCol} />
    </TouchableOpacity>
  );
}

// ─── Featured league block ────────────────────────────────────────────────────

function FeaturedLeagueBlock({ league, isFavorited, onToggleFavorite }) {
  const { colors, isDark } = useTheme();
  const favorited = isFavorited('league', league.league_id);
  const leagueBg = isDark ? 'rgba(255,255,255,0.88)' : 'rgba(0,0,0,0.04)';

  return (
    <View style={[styles.leagueBlock, { borderColor: colors.border }]}>
      <View style={[styles.leagueHeader, { borderBottomColor: colors.border }]}>
        <View style={styles.leagueHeaderLeft}>
          {league.league_logo ? (
            <View style={[styles.leagueLogoWrap, { backgroundColor: leagueBg }]}>
              <Image source={{ uri: league.league_logo }} style={styles.leagueLogo} resizeMode="contain" />
            </View>
          ) : null}
          <View>
            <Text style={[styles.leagueName, { color: colors.foreground }]}>{league.league_name}</Text>
            <Text style={[styles.leagueCountry, { color: colors.mutedForeground }]}>{league.country}</Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => onToggleFavorite({
            type: 'league',
            externalId: league.league_id,
            name: league.league_name,
            logo: league.league_logo,
          })}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name={favorited ? 'heart' : 'heart-outline'}
            size={20}
            color={favorited ? '#EF4444' : colors.mutedForeground}
          />
        </TouchableOpacity>
      </View>
      {league.matches.map(m => (
        <MatchRow
          key={m.id ?? `${m.date}-${m.teams?.home?.name}`}
          match={m}
          leagueCode={String(league.league_id)}
        />
      ))}
    </View>
  );
}

// ─── Country section (collapsible) ───────────────────────────────────────────

function CountrySection({ country, isFavorited }) {
  const { colors, isDark } = useTheme();
  const matchCount = useMemo(
    () => country.leagues.reduce((sum, l) => sum + l.matches.length, 0),
    [country.leagues]
  );

  const hasAnyFavorite = useMemo(
    () => country.leagues.some(l => isFavorited('league', l.league_id)),
    [country.leagues, isFavorited]
  );

  const [expanded, setExpanded] = useState(hasAnyFavorite);
  const leagueBg = isDark ? 'rgba(255,255,255,0.88)' : 'rgba(0,0,0,0.04)';

  return (
    <View style={[styles.countryBlock, { borderColor: colors.border }]}>
      <TouchableOpacity
        style={[styles.countryRow, { borderBottomColor: colors.border }]}
        onPress={() => { hapticSelect(); setExpanded(e => !e); }}
        activeOpacity={0.7}
      >
        <View style={styles.countryLeft}>
          {country.country_flag ? (
            <Text style={styles.countryFlag}>{country.country_flag}</Text>
          ) : null}
          <Text style={[styles.countryName, { color: colors.foreground }]}>{country.country}</Text>
        </View>
        <View style={styles.countryRight}>
          <Text style={[styles.matchCount, { color: colors.mutedForeground }]}>{matchCount}</Text>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={colors.mutedForeground}
          />
        </View>
      </TouchableOpacity>

      {expanded && country.leagues.map(league => (
        <View key={league.league_id}>
          <View style={[styles.innerLeagueHeader, { borderBottomColor: colors.border, borderTopColor: colors.border }]}>
            {league.league_logo ? (
              <View style={[styles.innerLeagueLogoWrap, { backgroundColor: leagueBg }]}>
                <Image source={{ uri: league.league_logo }} style={styles.innerLeagueLogo} resizeMode="contain" />
              </View>
            ) : null}
            <Text style={[styles.innerLeagueName, { color: colors.mutedForeground }]}>{league.league_name}</Text>
          </View>
          {league.matches.map(m => (
            <MatchRow
              key={m.id ?? `${m.date}-${m.teams?.home?.name}`}
              match={m}
              leagueCode={String(league.league_id)}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

// ─── Calendar modal ───────────────────────────────────────────────────────────

function CalendarModal({ visible, selectedDate, onSelect, onClose }) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);

  const [viewYear,  setViewYear]  = useState(selectedDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(selectedDate.getMonth());

  const cells = useMemo(() => buildCalendarDays(viewYear, viewMonth), [viewYear, viewMonth]);

  const cardWidth = Math.min(width - 40, 380);
  const cellSize  = Math.floor((cardWidth - 34) / 7); // 34 = (padding + borderWidth) * 2
  const bubbleSize = cellSize - 4;

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  }

  function handleDayPress(day) {
    if (!day) return;
    onSelect(new Date(viewYear, viewMonth, day));
    onClose();
  }

  const selY = selectedDate.getFullYear();
  const selM = selectedDate.getMonth();
  const selD = selectedDate.getDate();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.calendarOverlay} onPress={onClose}>
        <Pressable style={[styles.calendarCard, { backgroundColor: colors.card, borderColor: colors.border, width: cardWidth }]}>
          {/* Month nav */}
          <View style={styles.calendarHeader}>
            <TouchableOpacity onPress={prevMonth} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="chevron-back" size={22} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={[styles.calendarMonthLabel, { color: colors.foreground }]}>
              {MONTH_NAMES[viewMonth]} {viewYear}
            </Text>
            <TouchableOpacity onPress={nextMonth} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="chevron-forward" size={22} color={colors.foreground} />
            </TouchableOpacity>
          </View>

          {/* Day-of-week headers */}
          <View style={styles.calendarWeekRow}>
            {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
              <Text key={d} style={[styles.calendarWeekDay, { color: colors.mutedForeground, width: cellSize }]}>{d}</Text>
            ))}
          </View>

          {/* Day grid */}
          <View style={styles.calendarGrid}>
            {cells.map((day, idx) => {
              if (!day) return <View key={`e-${idx}`} style={{ width: cellSize, height: cellSize }} />;
              const cellDate = new Date(viewYear, viewMonth, day);
              cellDate.setHours(0, 0, 0, 0);
              const isToday    = cellDate.getTime() === today.getTime();
              const isSelected = selY === viewYear && selM === viewMonth && selD === day;
              return (
                <TouchableOpacity
                  key={day}
                  style={{ width: cellSize, height: cellSize, alignItems: 'center', justifyContent: 'center' }}
                  onPress={() => handleDayPress(day)}
                >
                  <View style={[
                    styles.calendarDayBubble,
                    { width: bubbleSize, height: bubbleSize, borderRadius: bubbleSize / 2 },
                    isSelected && { backgroundColor: colors.accent },
                    !isSelected && isToday && { borderWidth: 2, borderColor: colors.accent },
                  ]}>
                    <Text style={[
                      styles.calendarDayText,
                      { color: isSelected ? '#fff' : isToday ? colors.accent : colors.foreground },
                    ]}>
                      {day}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { colors } = useTheme();
  const { isFavorited, toggleFavorite } = useFavorites();

  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d;
  });
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [data,       setData]       = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (date, silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const { data: resp } = await api.get('/api/home/matches', { params: { date: toYMD(date), timezone: tz } });
      setData(resp);
    } catch (e) {
      setError(e.response?.data?.detail ?? 'Failed to load matches.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(selectedDate); }, [selectedDate]);

  // Auto-refresh every 60s when there are live matches
  const hasLiveMatches = useMemo(() => {
    if (!data) return false;
    const allMatches = [
      ...(data.featured ?? []).flatMap(l => l.matches),
      ...(data.countries ?? []).flatMap(c => c.leagues.flatMap(l => l.matches)),
    ];
    return allMatches.some(m => (m.status ?? '').toLowerCase() === 'live');
  }, [data]);

  useEffect(() => {
    if (!hasLiveMatches) return;
    const id = setInterval(() => fetchData(selectedDate, true), 60_000);
    return () => clearInterval(id);
  }, [hasLiveMatches, selectedDate, fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData(selectedDate);
    setRefreshing(false);
  }, [selectedDate, fetchData]);

  function shiftDate(delta) {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + delta);
    setSelectedDate(next);
  }

  // Sort featured leagues so those with live matches come first
  const sortedFeatured = useMemo(() => {
    if (!data?.featured) return [];
    return [...data.featured].sort((a, b) => {
      const aLive = a.matches.some(m => (m.status ?? '').toLowerCase() === 'live');
      const bLive = b.matches.some(m => (m.status ?? '').toLowerCase() === 'live');
      if (aLive && !bLive) return -1;
      if (!aLive && bLive) return 1;
      return 0;
    });
  }, [data]);

  const isEmpty = data && sortedFeatured.length === 0 && (data.countries ?? []).length === 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Date nav bar */}
      <View style={[styles.dateBar, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => shiftDate(-1)} hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}>
          <Ionicons name="chevron-back" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setCalendarVisible(true)} style={styles.dateLabelBtn}>
          <Text style={[styles.dateLabelText, { color: colors.foreground }]}>{dateLabel(selectedDate)}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => shiftDate(1)} hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}>
          <Ionicons name="chevron-forward" size={22} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      {/* Calendar modal */}
      <CalendarModal
        visible={calendarVisible}
        selectedDate={selectedDate}
        onSelect={setSelectedDate}
        onClose={() => setCalendarVisible(false)}
      />

      {/* Content */}
      {loading && <LoadingState />}
      {!loading && error && <ErrorState message={error} onRetry={() => fetchData(selectedDate)} />}
      {!loading && !error && (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        >
          {isEmpty && (
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No matches on this date.</Text>
          )}

          {/* Featured leagues (live first) */}
          {sortedFeatured.map(league => (
            <FeaturedLeagueBlock
              key={league.league_id}
              league={league}
              isFavorited={isFavorited}
              onToggleFavorite={toggleFavorite}
            />
          ))}

          {/* Country sections */}
          {(data?.countries ?? []).map(country => (
            <CountrySection
              key={country.country}
              country={country}
              isFavorited={isFavorited}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:     { flex: 1 },
  scrollContent: { paddingBottom: 120 },

  // Date bar
  dateBar:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1 },
  dateLabelBtn:  { flex: 1, alignItems: 'center' },
  dateLabelText: { fontSize: 16, fontWeight: '700' },

  // Empty
  emptyText: { textAlign: 'center', marginTop: 60, fontSize: 14 },

  // Featured league block
  leagueBlock:       { borderBottomWidth: 1 },
  leagueHeader:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 },
  leagueHeaderLeft:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  leagueLogoWrap:    { width: 32, height: 32, borderRadius: 6, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  leagueLogo:        { width: 26, height: 26 },
  leagueName:        { fontSize: 14, fontWeight: '700' },
  leagueCountry:     { fontSize: 11, fontWeight: '500' },

  // Country section
  countryBlock:           { borderBottomWidth: 1 },
  countryRow:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  countryLeft:            { flexDirection: 'row', alignItems: 'center', gap: 12 },
  countryRight:           { flexDirection: 'row', alignItems: 'center', gap: 8 },
  
  countryFlag:            { fontSize: 18 },
  countryName:            { fontSize: 15, fontWeight: '600' },
  matchCount:             { fontSize: 13, fontWeight: '600' },
  innerLeagueHeader:      { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8, borderTopWidth: 1, borderBottomWidth: 1 },
  innerLeagueLogoWrap:    { width: 22, height: 22, borderRadius: 4, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  innerLeagueLogo:        { width: 18, height: 18 },
  innerLeagueName:        { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },

  // Match row (mirrors AllMatchesView)
  matchRow:  { height: 64, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1 },
  statusCol: { width: 64, alignItems: 'center', justifyContent: 'center', gap: 3 },
  statusText:{ fontSize: 11, fontWeight: '700' },
  liveDot:   { width: 6, height: 6, borderRadius: 3, backgroundColor: '#EF4444' },
  liveText:  { fontSize: 10, fontWeight: '800', color: '#EF4444' },
  divider:   { width: 1, height: '60%', marginRight: 12 },
  teamsCol:  { flex: 1, justifyContent: 'center', gap: 5 },
  bellCol:   { width: 36, alignItems: 'center', justifyContent: 'center' },
  teamLine:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoWrap:  { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  teamLogo:  { width: 14, height: 14 },
  emoji:     { fontSize: 10 },
  teamName:  { flex: 1, fontSize: 13, fontWeight: '600' },
  winner:    { fontWeight: '800' },
  score:     { fontSize: 14, minWidth: 18, textAlign: 'right' },

  // Calendar modal
  calendarOverlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  calendarCard:       { borderRadius: 20, borderWidth: 1, padding: 16 },
  calendarHeader:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  calendarMonthLabel: { fontSize: 17, fontWeight: '700' },
  calendarWeekRow:    { flexDirection: 'row', marginBottom: 4 },
  calendarWeekDay:    { textAlign: 'center', fontSize: 11, fontWeight: '700' },
  calendarGrid:       { flexDirection: 'row', flexWrap: 'wrap' },
  calendarDayBubble:  { alignItems: 'center', justifyContent: 'center' },
  calendarDayText:    { fontSize: 14, fontWeight: '500' },
});
