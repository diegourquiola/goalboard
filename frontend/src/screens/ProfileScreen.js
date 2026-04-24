import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Alert, ScrollView, TextInput, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeContext';

export default function ProfileScreen({ navigation }) {
  const { user } = useAuth();
  const { colors } = useTheme();

  const [editingName, setEditingName]     = useState(false);
  const [nameValue, setNameValue]         = useState(user?.user_metadata?.full_name ?? '');
  const [savingName, setSavingName]       = useState(false);

  // 0 = idle, 1 = otp sent, 2 = verified (enter new password)
  const [pwStep, setPwStep]               = useState(0);
  const [sendingOtp, setSendingOtp]       = useState(false);
  const [otp, setOtp]                     = useState('');
  const [verifyingOtp, setVerifyingOtp]   = useState(false);
  const [newPassword, setNewPassword]     = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword]   = useState(false);

  async function handleLogout() {
    await supabase.auth.signOut();
    navigation.navigate('MainTabs');
  }

  async function saveName() {
    if (!nameValue.trim()) return;
    setSavingName(true);
    const { error } = await supabase.auth.updateUser({ data: { full_name: nameValue.trim() } });
    setSavingName(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setEditingName(false);
    }
  }

  async function sendOtp() {
    setSendingOtp(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: user.email,
      options: { shouldCreateUser: false },
    });
    setSendingOtp(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setPwStep(1);
    }
  }

  async function verifyOtp() {
    if (otp.trim().length < 4) {
      Alert.alert('Invalid code', 'Please enter the code from your email.');
      return;
    }
    setVerifyingOtp(true);
    const { error } = await supabase.auth.verifyOtp({
      email: user.email,
      token: otp.trim(),
      type: 'email',
    });
    setVerifyingOtp(false);
    if (error) {
      Alert.alert('Incorrect code', 'The code is wrong or has expired. Try sending a new one.');
    } else {
      setPwStep(2);
      setOtp('');
    }
  }

  async function savePassword() {
    if (newPassword.length < 8) {
      Alert.alert('Too short', 'Password must be at least 8 characters.');
      return;
    }
    if (!/[a-zA-Z]/.test(newPassword)) {
      Alert.alert('Weak password', 'Password must include at least one letter.');
      return;
    }
    if (!/[0-9]/.test(newPassword)) {
      Alert.alert('Weak password', 'Password must include at least one number.');
      return;
    }
    if (!/[^a-zA-Z0-9]/.test(newPassword)) {
      Alert.alert('Weak password', 'Password must include at least one symbol.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Mismatch', 'Passwords do not match.');
      return;
    }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Done', 'Password updated successfully.');
      setPwStep(0);
      setNewPassword('');
      setConfirmPassword('');
    }
  }

  const displayName = user?.user_metadata?.full_name ?? 'User';

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* Account info */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {/* Name row */}
        <View style={styles.fieldRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Name</Text>
            {editingName ? (
              <TextInput
                style={[styles.inlineInput, { color: colors.foreground, borderColor: colors.border }]}
                value={nameValue}
                onChangeText={setNameValue}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={saveName}
              />
            ) : (
              <Text style={[styles.value, { color: colors.foreground }]}>{displayName}</Text>
            )}
          </View>
          {editingName ? (
            <View style={styles.editActions}>
              <TouchableOpacity onPress={() => { setEditingName(false); setNameValue(displayName); }} style={styles.iconAction}>
                <Ionicons name="close" size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
              <TouchableOpacity onPress={saveName} style={styles.iconAction} disabled={savingName}>
                {savingName
                  ? <ActivityIndicator size="small" color={colors.accent} />
                  : <Ionicons name="checkmark" size={20} color={colors.accent} />
                }
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={() => setEditingName(true)} style={styles.iconAction}>
              <Ionicons name="pencil-outline" size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* Email row */}
        <View>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>Email</Text>
          <Text style={[styles.value, { color: colors.foreground }]}>{user?.email}</Text>
        </View>
      </View>

      {/* Change password */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Change Password</Text>

        {pwStep === 0 && (
          <>
            <Text style={[styles.hint, { color: colors.mutedForeground }]}>
              We'll send a one-time code to {user?.email} to verify your identity.
            </Text>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: colors.accent }]}
              onPress={sendOtp}
              disabled={sendingOtp}
            >
              {sendingOtp
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnText}>Send Verification Code</Text>
              }
            </TouchableOpacity>
          </>
        )}

        {pwStep === 1 && (
          <>
            <Text style={[styles.hint, { color: colors.mutedForeground }]}>
              Enter the 6-digit code sent to {user?.email}.
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
              placeholder="Verification code"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="number-pad"
              value={otp}
              onChangeText={setOtp}
            />
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: colors.accent }]}
              onPress={verifyOtp}
              disabled={verifyingOtp}
            >
              {verifyingOtp
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnText}>Verify Code</Text>
              }
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setPwStep(0); setOtp(''); }}>
              <Text style={[styles.textLink, { color: colors.mutedForeground }]}>Cancel</Text>
            </TouchableOpacity>
          </>
        )}

        {pwStep === 2 && (
          <>
            <Text style={[styles.hint, { color: colors.mutedForeground }]}>
              Choose a new password (8+ chars, letter, number, symbol).
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
              placeholder="New password"
              placeholderTextColor={colors.mutedForeground}
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
            />
            <TextInput
              style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
              placeholder="Confirm new password"
              placeholderTextColor={colors.mutedForeground}
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: colors.accent }]}
              onPress={savePassword}
              disabled={savingPassword}
            >
              {savingPassword
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnText}>Update Password</Text>
              }
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setPwStep(0); setNewPassword(''); setConfirmPassword(''); }}>
              <Text style={[styles.textLink, { color: colors.mutedForeground }]}>Cancel</Text>
            </TouchableOpacity>
          </>
        )}
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
  container:    { flex: 1 },
  content:      { padding: 16, gap: 16 },
  card:         { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  sectionLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  label:        { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  value:        { fontSize: 16, fontWeight: '500' },
  fieldRow:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  editActions:  { flexDirection: 'row', gap: 4 },
  iconAction:   { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  inlineInput:  { fontSize: 16, fontWeight: '500', borderBottomWidth: 1, paddingVertical: 4 },
  divider:      { height: 1 },
  hint:         { fontSize: 13, fontWeight: '500', lineHeight: 18 },
  input:        { height: 46, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, fontSize: 15 },
  btn:          { height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnText:      { color: '#fff', fontWeight: '700', fontSize: 15 },
  textLink:     { textAlign: 'center', fontSize: 13, fontWeight: '600', paddingVertical: 8 },
});
