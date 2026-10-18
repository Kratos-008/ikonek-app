import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://ikonek-app.onrender.com';
const PUSH_TOKEN_STORAGE_KEY = '@ikonek_push_token';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotifications() {
  if (!Device.isDevice) return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'General notifications',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#4F46E5',
    });
  }

  const { status: currentStatus } = await Notifications.getPermissionsAsync();
  const permission = currentStatus === 'granted'
    ? { status: currentStatus }
    : await Notifications.requestPermissionsAsync();
  if (permission.status !== 'granted') return null;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) throw new Error('Expo project ID is missing from app configuration.');

  const expoPushToken = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  const authToken = await AsyncStorage.getItem('@ikonek_token');
  if (!authToken) return null;

  const response = await fetch(`${API_URL}/api/notifications/device-token`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({ token: expoPushToken, platform: Platform.OS }),
  });
  if (!response.ok) throw new Error('Unable to register this device for notifications.');
  await AsyncStorage.setItem(PUSH_TOKEN_STORAGE_KEY, expoPushToken);
  return expoPushToken;
}

export async function unregisterPushNotifications() {
  const [pushToken, authToken] = await Promise.all([
    AsyncStorage.getItem(PUSH_TOKEN_STORAGE_KEY),
    AsyncStorage.getItem('@ikonek_token'),
  ]);
  if (!pushToken) return;

  try {
    if (authToken) {
      await fetch(`${API_URL}/api/notifications/device-token`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ token: pushToken }),
      });
    }
  } finally {
    await AsyncStorage.removeItem(PUSH_TOKEN_STORAGE_KEY);
  }
}
