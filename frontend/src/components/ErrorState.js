import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

export default function ErrorState({ message = 'Something went wrong.', onRetry }) {
  const { colors } = useTheme();
  return (
    <View style={styles.container}>
      <Ionicons name="alert-circle-outline" size={40} color={colors.destructive} style={{ marginBottom: 12 }} />
      <Text style={[styles.message, { color: colors.destructive }]}>{message}</Text>
      {onRetry && (
        <TouchableOpacity style={[styles.button, { backgroundColor: colors.accent }]} onPress={onRetry}>
          <Text style={[styles.buttonText, { color: colors.accentForeground }]}>Retry</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  message:    { fontSize: 16, textAlign: 'center', marginBottom: 16 },
  button:     { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  buttonText: { fontWeight: '600' },
});
