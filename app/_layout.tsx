import { useEffect } from 'react';
import { I18nManager, useColorScheme } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { setAudioModeAsync } from 'expo-audio';
import Constants from 'expo-constants';
import { requestNotificationPermissions } from '../src/services/notificationService';
import { registerBackgroundFetch } from '../src/tasks/backgroundFetch';
import { PreferencesProvider } from '../src/context/PreferencesContext';
import { LiveAlertProvider } from '../src/context/LiveAlertContext';
import { AlertHistoryProvider } from '../src/context/AlertHistoryContext';

export default function RootLayout() {
  const isDark = useColorScheme() === 'dark';

  useEffect(() => {
    // Enable RTL for Hebrew
    if (!I18nManager.isRTL) {
      I18nManager.forceRTL(true);
    }

    // Set up audio session for alert sounds
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
    }).catch(() => {});

    // Request local notification permissions (works in both Expo Go and standalone)
    requestNotificationPermissions().catch(() => {});

    // Background tasks are not available in Expo Go SDK 53+
    const isExpoGo = Constants.appOwnership === 'expo';
    if (!isExpoGo) {
      registerBackgroundFetch().catch(() => {});
    }
  }, []);

  return (
    <SafeAreaProvider>
      <PreferencesProvider>
        <LiveAlertProvider>
          <AlertHistoryProvider>
            <StatusBar style={isDark ? 'light' : 'dark'} />
            <Stack screenOptions={{ headerShown: false }} />
          </AlertHistoryProvider>
        </LiveAlertProvider>
      </PreferencesProvider>
    </SafeAreaProvider>
  );
}
