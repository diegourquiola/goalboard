import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Team detail is shown as an inline modal from StandingsScreen in Sprint 1.
// This screen is reserved for direct deep-link navigation in a future sprint.
export default function TeamDetailScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Team Detail</Text>
      <Text style={styles.subtitle}>Tap a team in the Standings tab to view details.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', padding: 24 },
  title:     { fontSize: 24, fontWeight: 'bold', marginBottom: 8, color: '#111827' },
  subtitle:  { fontSize: 14, color: '#6B7280', textAlign: 'center' },
});
