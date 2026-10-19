import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import {
  getScreenForNotification,
  registerForPushNotifications,
} from '../services/pushNotifications';
import { isAdminUser } from '../services/session';

const warn = (label) => (error) => console.warn(label, error?.message || error);

// Keeps push notifications healthy while the app runs:
//  1. Tapping a notification opens the right screen (even from a closed app).
//  2. The push token is re-sent if Android changes it.
//  3. Coming back to the app re-syncs the token, which also picks up a
//     permission the user turned on in phone settings.
export default function usePushLifecycle({ user, onOpenScreen }) {
  const userRef = useRef(user);
  const openRef = useRef(onOpenScreen);
  const pendingScreenRef = useRef(null);
  const lastHandledRef = useRef(null);

  useEffect(() => {
    userRef.current = user;
    openRef.current = onOpenScreen;
  });

  // --- 1. Notification taps ------------------------------------------------
  useEffect(() => {
    const openIfAllowed = (screen) => {
      // Admins use the admin dashboard, which has no Notifications/Events screens.
      if (isAdminUser(userRef.current)) return;
      openRef.current?.(screen);
    };

    const handleResponse = (response) => {
      if (!response?.notification) return;
      const key = `${response.notification.request.identifier}:${response.actionIdentifier}`;
      if (lastHandledRef.current === key) return;
      lastHandledRef.current = key;

      const screen = getScreenForNotification(response);
      if (userRef.current) openIfAllowed(screen);
      else pendingScreenRef.current = screen; // app was closed: open it once the session is restored
    };

    const subscription = Notifications.addNotificationResponseReceivedListener(handleResponse);
    if (typeof Notifications.getLastNotificationResponseAsync === 'function') {
      Notifications.getLastNotificationResponseAsync()
        .then(handleResponse)
        .catch(warn('Could not read the notification that opened the app:'));
    }
    return () => subscription.remove();
  }, []);

  // A tap that arrived before the user was signed in/restored.
  useEffect(() => {
    if (!user || !pendingScreenRef.current) return;
    const screen = pendingScreenRef.current;
    pendingScreenRef.current = null;
    if (!isAdminUser(user)) openRef.current?.(screen);
  }, [user]);

  // --- 2 + 3. Keep the push token fresh while signed in ----------------------
  const userId = user?.id;
  useEffect(() => {
    if (!userId) return undefined;

    const tokenSubscription = Notifications.addPushTokenListener(() => {
      registerForPushNotifications({ prompt: false, force: true })
        .catch(warn('Push token refresh failed:'));
    });
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        registerForPushNotifications({ prompt: false })
          .catch(warn('Push token sync failed:'));
      }
    });

    return () => {
      tokenSubscription.remove();
      appStateSubscription.remove();
    };
  }, [userId]);
}
