import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerPushToken(backendUrl, accessToken) {
  if (!Device.isDevice) return;

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[PushToken] permission not granted:', finalStatus);
      return;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('match-events', {
        name: 'Match Events',
        importance: Notifications.AndroidImportance.MAX,
        sound: true,
      });
    }

    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      Constants?.easConfig?.projectId;

    console.log('[PushToken] projectId:', projectId, 'backendUrl:', backendUrl);

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenData.data;

    console.log('[PushToken] token obtained:', token?.slice(0, 40));

    const res = await fetch(`${backendUrl}/api/push-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ token, platform: Platform.OS }),
    });

    if (!res.ok) {
      console.error('[PushToken] POST failed', res.status, await res.text().catch(() => ''));
    } else {
      console.log('[PushToken] registered successfully');
    }
  } catch (e) {
    console.error('[PushToken] unexpected error:', e);
  }
}
