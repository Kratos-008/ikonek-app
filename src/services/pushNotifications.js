import { Alert, Linking, Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config';

const TOKEN_KEY = '@ikonek_token';
const PUSH_TOKEN_STORAGE_KEY = '@ikonek_push_token';
const PUSH_SYNCED_AT_KEY = '@ikonek_push_synced_at';
const SETTINGS_PROMPTED_KEY = '@ikonek_notification_settings_prompted';

// Keys EventsScreen uses to remember locally scheduled event reminders.
const EVENT_REMINDER_KEYS = [
  '@ikonek_event_reminder_notifications',
  '@ikonek_event_reminder_state',
];

export const NOTIFICATION_CHANNEL_ID = 'default';
const SYNC_INTERVAL_MS = 12 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 8000;

// Show notifications while the app is open, too. This is the only handler in
// the app (the duplicate in EventsScreen was removed).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ---------------------------------------------------------------------------
// Android channel. Created once, before any permission prompt or local
// reminder, so notifications use the right importance/vibration.
// ---------------------------------------------------------------------------
let channelPromise = null;

export function ensureNotificationChannel() {
  if (Platform.OS !== 'android') return Promise.resolve();
  if (!channelPromise) {
    channelPromise = Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_ID, {
      name: 'General notifications',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#4F46E5',
    }).catch((error) => {
      channelPromise = null; // try again next time
      console.warn('Could not create notification channel:', error?.message || error);
    });
  }
  return channelPromise;
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Registration
//   prompt: ask for permission if the OS still allows asking
//   force:  upload even if this phone was synced recently (used at sign-in so
//           the token always moves to the account that is signed in now)
// Returns { status, token }. status is one of:
//   registered | skipped | not_granted | blocked | unavailable | no_session
// Calls run one after another, so a sign-in and an app-foreground event can
// never race each other.
// ---------------------------------------------------------------------------
async function doRegister({ prompt = false, force = false } = {}) {
  await ensureNotificationChannel();
  if (!Device.isDevice) return { status: 'unavailable', token: null };

  let { status, canAskAgain } = await Notifications.getPermissionsAsync();
  if (status !== 'granted' && prompt && canAskAgain) {
    ({ status, canAskAgain } = await Notifications.requestPermissionsAsync());
  }
  if (status !== 'granted') {
    return { status: canAskAgain ? 'not_granted' : 'blocked', token: null };
  }

  const authToken = await AsyncStorage.getItem(TOKEN_KEY);
  if (!authToken) return { status: 'no_session', token: null };

  if (!force) {
    const [[, savedToken], [, syncedAt]] = await AsyncStorage.multiGet([
      PUSH_TOKEN_STORAGE_KEY,
      PUSH_SYNCED_AT_KEY,
    ]);
    if (savedToken && syncedAt && Date.now() - Number(syncedAt) < SYNC_INTERVAL_MS) {
      return { status: 'skipped', token: savedToken };
    }
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) throw new Error('Expo project ID is missing from app configuration.');

  const expoPushToken = (await Notifications.getExpoPushTokenAsync({ projectId })).data;

  const response = await fetchWithTimeout(`${API_URL}/api/notifications/device-token`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({ token: expoPushToken, platform: Platform.OS }),
  });
  if (!response.ok) throw new Error(`Unable to register this device for notifications (HTTP ${response.status}).`);

  await AsyncStorage.multiSet([
    [PUSH_TOKEN_STORAGE_KEY, expoPushToken],
    [PUSH_SYNCED_AT_KEY, String(Date.now())],
  ]);
  return { status: 'registered', token: expoPushToken };
}

let registrationQueue = Promise.resolve();

export function registerForPushNotifications(options = {}) {
  const run = () => doRegister(options);
  const result = registrationQueue.then(run, run);
  registrationQueue = result.catch(() => {});
  return result;
}

// Called right after a successful sign-in: ask for permission, upload the
// token, and if Android has permanently blocked notifications, explain once
// how to turn them back on.
export async function registerAfterSignIn() {
  const result = await registerForPushNotifications({ prompt: true, force: true });
  if (result.status === 'blocked') await explainBlockedPermissionOnce();
  return result;
}

async function explainBlockedPermissionOnce() {
  const alreadyShown = await AsyncStorage.getItem(SETTINGS_PROMPTED_KEY);
  if (alreadyShown) return;
  await AsyncStorage.setItem(SETTINGS_PROMPTED_KEY, '1');
  Alert.alert(
    'Notifications are turned off',
    'You will miss announcements and event reminders. You can turn notifications on for iKonek in your phone settings.',
    [
      { text: 'Not now', style: 'cancel' },
      { text: 'Open Settings', onPress: () => Linking.openSettings() },
    ]
  );
}

// ---------------------------------------------------------------------------
// Sign-out helpers
// ---------------------------------------------------------------------------

// Removes this phone's push token from the server (so the next person who signs
// in here does not receive the previous user's pushes) and forgets it locally.
// Never blocks logout for more than a few seconds, even if the server is asleep.
export async function unregisterPushNotifications({ skipServer = false } = {}) {
  const [pushToken, authToken] = await Promise.all([
    AsyncStorage.getItem(PUSH_TOKEN_STORAGE_KEY),
    AsyncStorage.getItem(TOKEN_KEY),
  ]);

  try {
    if (!skipServer && pushToken && authToken) {
      await fetchWithTimeout(`${API_URL}/api/notifications/device-token`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ token: pushToken }),
      });
    }
  } catch (error) {
    // If this fails the token stays on the server until the next account to
    // sign in on this phone registers it (the server moves it to that account).
    console.warn('Could not remove push token from the server:', error?.message || error);
  } finally {
    await AsyncStorage.multiRemove([PUSH_TOKEN_STORAGE_KEY, PUSH_SYNCED_AT_KEY]);
  }
}

// Local event reminders belong to the person who set them. Cancel them and
// clear anything already sitting in the notification tray on logout.
export async function clearLocalNotificationState() {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.warn('Could not cancel scheduled reminders:', error?.message || error);
  }
  try {
    await Notifications.dismissAllNotificationsAsync();
  } catch (error) {
    console.warn('Could not clear delivered notifications:', error?.message || error);
  }
  await AsyncStorage.multiRemove(EVENT_REMINDER_KEYS);
}

// ---------------------------------------------------------------------------
// Tap handling: which screen should open for a tapped notification?
//   server pushes carry data.type   -> the notification list
//   local event reminders carry data.eventId only -> the events screen
// ---------------------------------------------------------------------------
export function getScreenForNotification(response) {
  const data = response?.notification?.request?.content?.data || {};
  if (data.type) return 'Notifications';
  if (data.eventId) return 'Events';
  return 'Notifications';
}
