import { useState, useEffect } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BIOMETRICS_KEY = '@goalboard_biometrics_enabled';

export function useBiometrics() {
  const [enabled, setEnabled] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    LocalAuthentication.hasHardwareAsync().then(setSupported);
    AsyncStorage.getItem(BIOMETRICS_KEY).then(val => setEnabled(val === 'true'));
  }, []);

  async function enable() {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Confirm to enable Face ID',
    });
    if (result.success) {
      await AsyncStorage.setItem(BIOMETRICS_KEY, 'true');
      setEnabled(true);
    }
    return result.success;
  }

  async function disable() {
    await AsyncStorage.setItem(BIOMETRICS_KEY, 'false');
    setEnabled(false);
  }

  async function authenticate() {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Unlock GoalBoard',
      fallbackLabel: 'Use Passcode',
    });
    return result.success;
  }

  return { enabled, supported, enable, disable, authenticate };
}
