import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';

const SCREEN_W = Dimensions.get('window').width;
const PITCH_W = SCREEN_W - 40;
const PITCH_H = PITCH_W * 1.45;

function getLastName(name) {
  if (!name) return '';
  const parts = name.split(' ');
  return parts.length > 1 ? parts[parts.length - 1] : name;
}

function ratingColor(r) {
  if (r >= 7.5) return '#22C55E';
  if (r >= 6.5) return '#F59E0B';
  return '#EF4444';
}

export default function PitchFormation({ players, formation, teamName, onPlayerPress, isDark, subbedOutIds = new Set(), ratings = {}, captainIds = new Set() }) {
  const hasGrid = players.some(p => p.grid);
  if (!hasGrid || players.length === 0) return null;

  const maxRow = Math.max(...players.map(p => {
    if (!p.grid) return 1;
    return parseInt(p.grid.split(':')[0], 10) || 1;
  }));

  return (
    <View style={styles.wrapper}>
      {formation && (
        <View style={styles.formationRow}>
          <Text style={[styles.formationLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>{teamName}</Text>
          <Text style={[styles.formationValue, { color: isDark ? '#E2E8F0' : '#1E293B' }]}>{formation}</Text>
        </View>
      )}

      <View style={[styles.pitch, { height: PITCH_H }]}>
        {/* Pitch markings */}
        <View style={styles.halfwayLine} />
        <View style={styles.centerCircle} />
        <View style={styles.centerDot} />

        <View style={[styles.penaltyBox, styles.penaltyBoxTop]} />
        <View style={[styles.goalBox, styles.goalBoxTop]} />
        <View style={[styles.penaltyBox, styles.penaltyBoxBottom]} />
        <View style={[styles.goalBox, styles.goalBoxBottom]} />

        <View style={[styles.cornerArc, styles.cornerTL]} />
        <View style={[styles.cornerArc, styles.cornerTR]} />
        <View style={[styles.cornerArc, styles.cornerBL]} />
        <View style={[styles.cornerArc, styles.cornerBR]} />

        {/* Player markers */}
        {players.map((p, i) => {
          if (!p.grid) return null;
          const [rowStr, colStr] = p.grid.split(':');
          const row = parseInt(rowStr, 10);
          const col = parseInt(colStr, 10);

          const playersInRow = players.filter(pl => pl.grid && parseInt(pl.grid.split(':')[0], 10) === row);
          const totalCols = playersInRow.length;

          const yPct = ((row - 0.5) / maxRow);
          const xPct = totalCols === 1 ? 0.5 : (col - 1) / (totalCols - 1) * 0.7 + 0.15;

          const x = xPct * (PITCH_W - 40) + 20;
          const y = yPct * (PITCH_H - 50) + 10;

          return (
            <TouchableOpacity
              key={p.id ?? i}
              style={[styles.playerMarker, { left: x - 22, top: y - 22 }]}
              activeOpacity={0.7}
              onPress={() => onPlayerPress && p.id && onPlayerPress(p)}
            >
              <View style={{ position: 'relative' }}>
                <View style={styles.jerseyCircle}>
                  {p.photo ? (
                    <Image source={{ uri: p.photo }} style={styles.playerImg} />
                  ) : (
                    <Text style={styles.jerseyNum}>{p.number ?? ''}</Text>
                  )}
                </View>
                {subbedOutIds.has(p.id) && (
                  <View style={styles.subBadge}>
                    <Text style={styles.subBadgeText}>↕</Text>
                  </View>
                )}
                {captainIds.has(p.id) && (
                  <View style={styles.captainBadge}>
                    <Text style={styles.captainBadgeText}>C</Text>
                  </View>
                )}
              </View>
              <Text style={styles.playerLabel} numberOfLines={1}>
                {p.number != null ? `${p.number}. ` : ''}{getLastName(p.name)}
              </Text>
              {ratings[p.id] != null && (
                <View style={[styles.ratingBadge, { backgroundColor: ratingColor(ratings[p.id]) }]}>
                  <Text style={styles.ratingText}>{ratings[p.id]}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 16 },

  formationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  formationLabel: { fontSize: 12, fontWeight: '700' },
  formationValue: { fontSize: 14, fontWeight: '900' },

  pitch: {
    width: PITCH_W,
    backgroundColor: '#2D8B4E',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
    overflow: 'hidden',
    position: 'relative',
  },

  halfwayLine: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  centerCircle: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 70,
    height: 70,
    marginLeft: -35,
    marginTop: -35,
    borderRadius: 35,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  centerDot: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 6,
    height: 6,
    marginLeft: -3,
    marginTop: -3,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },

  penaltyBox: {
    position: 'absolute',
    left: '20%',
    width: '60%',
    height: '16%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  penaltyBoxTop: { top: 0, borderTopWidth: 0 },
  penaltyBoxBottom: { bottom: 0, borderBottomWidth: 0 },

  goalBox: {
    position: 'absolute',
    left: '33%',
    width: '34%',
    height: '7%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  goalBoxTop: { top: 0, borderTopWidth: 0 },
  goalBoxBottom: { bottom: 0, borderBottomWidth: 0 },

  cornerArc: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  cornerTL: { top: -8, left: -8, borderRadius: 8, borderLeftColor: 'transparent', borderTopColor: 'transparent' },
  cornerTR: { top: -8, right: -8, borderRadius: 8, borderRightColor: 'transparent', borderTopColor: 'transparent' },
  cornerBL: { bottom: -8, left: -8, borderRadius: 8, borderLeftColor: 'transparent', borderBottomColor: 'transparent' },
  cornerBR: { bottom: -8, right: -8, borderRadius: 8, borderRightColor: 'transparent', borderBottomColor: 'transparent' },

  playerMarker: {
    position: 'absolute',
    width: 44,
    alignItems: 'center',
    zIndex: 10,
  },
  jerseyCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  playerImg: { width: 32, height: 32, borderRadius: 16 },
  subBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#fff',
  },
  subBadgeText: { color: '#fff', fontSize: 7, fontWeight: '900' },
  captainBadge: {
    position: 'absolute',
    top: -2,
    left: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#fff',
  },
  captainBadgeText: { color: '#fff', fontSize: 7, fontWeight: '900' },
  jerseyNum: { color: '#fff', fontSize: 13, fontWeight: '900' },
  playerLabel: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 2,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    width: 60,
  },
  ratingBadge: {
    marginTop: 2,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
  },
  ratingText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '900',
  },
});
