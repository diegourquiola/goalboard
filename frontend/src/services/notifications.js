import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, Alert } from 'react-native';
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
      Alert.alert('PushToken', `Permission not granted: ${finalStatus}`);
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

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenData.data;

    const res = await fetch(`${backendUrl}/api/push-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ token, platform: Platform.OS }),
    });

    const responseText = await res.text().catch(() => '');
    if (!res.ok) {
      Alert.alert('PushToken Failed', `Status ${res.status}\n${responseText}`);
    } else {
      Alert.alert('PushToken OK', `Registered!\n${token?.slice(0, 40)}`);
    }
  } catch (e) {
    Alert.alert('PushToken Error', String(e));
  }
}
