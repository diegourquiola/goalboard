import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as AppleAuthentication from 'expo-apple-authentication';
import { supabase } from '../../services/supabase';
import { useTheme } from '../../theme/ThemeContext';
import { useAuth } from '../../context/AuthContext';

WebBrowser.maybeCompleteAuthSession();

export default function SignupScreen({ navigation }) {
  const { colors } = useTheme();
  const { session } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const [, googleResponse, promptGoogleLogin] = Google.useIdTokenAuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
  });

  useEffect(() => {
    if (session) {
      navigation.getParent()?.navigate('MainTabs');
    }
  }, [session]);

  useEffect(() => {
    if (googleResponse?.type === 'success') {
      const { id_token } = googleResponse.params;
      supabase.auth.signInWithIdToken({ provider: 'google', token: id_token })
        .then(({ error }) => { if (error) Alert.alert('Google sign-in failed', error.message); });
    }
  }, [googleResponse]);

  async function handleSignup() {
    if (!email || !password || !name) return;
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });
    setLoading(false);
    if (error) {
      Alert.alert('Signup failed', error.message);
    } else {
      Alert.alert('Check your email', 'We sent you a confirmation link.');
    }
  }

  async function handleAppleLogin() {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });
      if (error) Alert.alert('Apple sign-in failed', error.message);
    } catch (e) {
      if (e.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert('Apple sign-in failed', e.message);
      }
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Text style={[styles.title, { color: colors.foreground }]}>Create account</Text>

      <TextInput
        style={[styles.input, { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border }]}
        placeholder="Full name"
        placeholderTextColor={colors.mutedForeground}
        value={name}
        onChangeText={setName}
      />
      <TextInput
        style={[styles.input, { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border }]}
        placeholder="Email"
        placeholderTextColor={colors.mutedForeground}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={[styles.input, { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border }]}
        placeholder="Password (min 6 characters)"
        placeholderTextColor={colors.mutedForeground}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity
        style={[styles.btn, { backgroundColor: colors.accent }]}
        onPress={handleSignup}
        disabled={loading}
      >
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.btnText}>Sign Up</Text>
        }
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.oauthBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => promptGoogleLogin()}
      >
        <Text style={[styles.oauthText, { color: colors.foreground }]}>Continue with Google</Text>
      </TouchableOpacity>

      {Platform.OS === 'ios' && (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
          cornerRadius={12}
          style={{ width: '100%', height: 50 }}
          onPress={handleAppleLogin}
        />
      )}

      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={[styles.link, { color: colors.accent }]}>Already have an account? Log in</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, gap: 12 },
  title:     { fontSize: 28, fontWeight: '800', marginBottom: 8 },
  input:     { height: 50, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, fontSize: 16 },
  btn:       { height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnText:   { color: '#fff', fontWeight: '700', fontSize: 16 },
  oauthBtn:  { height: 50, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  oauthText: { fontWeight: '600', fontSize: 15 },
  link:      { textAlign: 'center', marginTop: 8, fontWeight: '500' },
});
