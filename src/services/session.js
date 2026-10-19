import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config';
import {
  clearLocalNotificationState,
  unregisterPushNotifications,
} from './pushNotifications';

// Same keys SignIn.js / LinkMemberScreen.js already write, so every screen that
// reads '@ikonek_token' keeps working unchanged.
export const TOKEN_KEY = '@ikonek_token';
export const USER_KEY = '@ikonek_user';

const VERIFY_TIMEOUT_MS = 15000;

export function isAdminUser(user) {
  const role = String(user?.role || '').trim().toLowerCase();
  return role === 'admin' || role === 'superadmin';
}

// Local-only and instant: what is saved on this phone.
export async function loadStoredSession() {
  const [[, token], [, userRaw]] = await AsyncStorage.multiGet([TOKEN_KEY, USER_KEY]);
  if (!token) return null;

  let user = null;
  try {
    user = userRaw ? JSON.parse(userRaw) : null;
  } catch {
    user = null;
  }
  return { token, user };
}

// Asks the server whether the saved token is still good.
//   { valid: true, user }  token accepted (user data and a fresh token are saved)
//   { valid: false }       server said 401 -> the session really is over
//   { valid: null }        could not tell (offline, server asleep, 5xx) -> keep the user signed in
export async function verifySession(token) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), VERIFY_TIMEOUT_MS);
  try {
    const response = await fetch(`${API_URL}/api/auth/me`, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
      signal: controller.signal,
    });
    if (response.status === 401) return { valid: false };
    if (!response.ok) return { valid: null };

    const data = await response.json();
    if (!data?.user) return { valid: null };

    const writes = [[USER_KEY, JSON.stringify(data.user)]];
    // The server hands out a fresh token on each check, so anyone who opens the
    // app regularly is never signed out by expiry.
    if (typeof data.token === 'string' && data.token) writes.push([TOKEN_KEY, data.token]);
    await AsyncStorage.multiSet(writes);
    return { valid: true, user: data.user };
  } catch {
    return { valid: null };
  } finally {
    clearTimeout(timer);
  }
}

export async function clearStoredSession() {
  await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
}

// The one logout path. Order matters: tell the server to forget this phone's
// push token while we still have a valid login, then wipe local state.
export async function signOutCleanup({ skipServer = false } = {}) {
  await unregisterPushNotifications({ skipServer }).catch((error) => {
    console.warn('Push token cleanup failed:', error?.message || error);
  });
  await clearLocalNotificationState();
  await clearStoredSession();
}
