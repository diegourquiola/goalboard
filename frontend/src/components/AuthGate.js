import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';

export default function AuthGate({ visible, onClose }) {
  const { colors } = useTheme();
  const navigation = useNavigation();

  function goToLogin() {
    onClose();
    navigation.navigate('Auth', { screen: 'Login' });
  }

  function goToSignup() {
    onClose();
    navigation.navigate('Auth', { screen: 'Signup' });
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: colors.card }]}>
          <Text style={[styles.title, { color: colors.foreground }]}>Sign in to add favorites</Text>
          <Text style={[styles.sub, { color: colors.mutedForeground }]}>
            Create an account to save your favorite teams, leagues, and players.
          </Text>
          <TouchableOpacity style={[styles.btn, { backgroundColor: colors.accent }]} onPress={goToLogin}>
            <Text style={styles.btnText}>Log In</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, { backgroundColor: colors.muted }]} onPress={goToSignup}>
            <Text style={[styles.btnText, { color: colors.foreground }]}>Sign Up</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose}>
            <Text style={[styles.cancel, { color: colors.mutedForeground }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet:   { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, gap: 12 },
  title:   { fontSize: 20, fontWeight: '800' },
  sub:     { fontSize: 14, lineHeight: 20 },
  btn:     { height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  cancel:  { textAlign: 'center', marginTop: 4, fontWeight: '500' },
});
