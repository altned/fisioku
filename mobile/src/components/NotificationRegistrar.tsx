import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

export function NotificationRegistrar() {
  const { token } = useAuth();
  const registeredTokenRef = useRef<string | null>(null);
  const authTokenRef = useRef<string | null>(null);

  useEffect(() => {
    const previousAuthToken = authTokenRef.current;
    authTokenRef.current = token ?? null;
    if (!token) {
      if (registeredTokenRef.current && previousAuthToken) {
        void api
          .removeNotificationToken(
            previousAuthToken,
            registeredTokenRef.current,
          )
          .catch(() => undefined);
      }
      registeredTokenRef.current = null;
      return;
    }

    let cancelled = false;
    const register = async () => {
      const pushToken = await getDevicePushTokenAsync();
      if (!pushToken || cancelled) {
        return;
      }
      if (registeredTokenRef.current === pushToken) {
        return;
      }

      await api.registerNotificationToken(token, {
        token: pushToken,
        platform: Platform.OS,
      });
      registeredTokenRef.current = pushToken;
    };

    register().catch(() => {
      // ignore errors, user can retry later
    });

    return () => {
      cancelled = true;
    };
  }, [token]);

  return null;
}

async function getDevicePushTokenAsync() {
  if (!Device.isDevice) {
    return null;
  }
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    return null;
  }
  const deviceToken = await Notifications.getDevicePushTokenAsync();
  return deviceToken.data;
}
