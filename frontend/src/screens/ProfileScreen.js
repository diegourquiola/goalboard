import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Alert, ScrollView, Switch, TextInput, ActivityIndicator,
} from 'react-native';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import { useBiometrics } from '../hooks/useBiometrics';

export default function ProfileScreen({ navigation }) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { enabled: biometricsEnabled, supported, enable, disable } = useBiometrics();
  const [newPassword, setNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  async function handleLogout() {
    await supabase.auth.signOut();
    navigation.navigate('MainTabs');
  }

  async function handleChangePassword() {
    if (newPassword.length < 6) {
      Alert.alert('Too short', 'Password must be at least 6 characters.');
      return;
    }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPassword(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Done', 'Password updated.');
      setNewPassword('');
    }
  }

  async function toggleBiometrics(val) {
    if (val) {
      await enable();
    } else {
      await disable();
    }
  }

  const name = user?.user_metadata?.full_name ?? 'User';

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>Name</Text>
        <Text style={[styles.value, { color: colors.foreground }]}>{name}</Text>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>Email</Text>
        <Text style={[styles.value, { color: colors.foreground }]}>{user?.email}</Text>
      </View>

      {supported && (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.row}>
            <Text style={[styles.value, { color: colors.foreground }]}>Face ID / Touch ID</Text>
            <Switch value={biometricsEnabled} onValueChange={toggleBiometrics} />
          </View>
        </View>
      )}

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>Change Password</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
          placeholder="New password"
          placeholderTextColor={colors.mutedForeground}
          secureTextEntry
          value={newPassword}
          onChangeText={setNewPassword}
        />
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: colors.accent }]}
          onPress={handleChangePassword}
          disabled={changingPassword}
        >
          {changingPassword
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>Update Password</Text>
          }
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.btn, { backgroundColor: colors.destructive }]}
        onPress={handleLogout}
      >
        <Text style={styles.btnText}>Log Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content:   { padding: 16, gap: 16 },
  card:      { borderRadius: 16, borderWidth: 1, padding: 16, gap: 8 },
  label:     { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  value:     { fontSize: 16, fontWeight: '500' },
  row:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  input:     { height: 46, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, fontSize: 15 },
  btn:       { height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnText:   { color: '#fff', fontWeight: '700', fontSize: 15 },
});
