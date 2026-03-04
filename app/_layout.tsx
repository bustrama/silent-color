import { useEffect } from 'react';
import { Alert, Linking, Platform, I18nManager, useColorScheme } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { setAudioModeAsync } from 'expo-audio';
import Constants from 'expo-constants';
import { requestNotificationPermissions } from '../src/services/notificationService';
import { registerBackgroundFetch } from '../src/tasks/backgroundFetch';
import { getBatteryPromptShown, setBatteryPromptShown } from '../src/services/storageService';
import { PreferencesProvider } from '../src/context/PreferencesContext';
import { LiveAlertProvider } from '../src/context/LiveAlertContext';
import { AlertHistoryProvider } from '../src/context/AlertHistoryContext';
import { OnboardingModal } from '../src/components/OnboardingModal';

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

      // Android: prompt once to disable battery optimization so background alerts
      // aren't killed by Doze mode. Without this exemption the OS can delay or
      // skip the background task entirely.
      if (Platform.OS === 'android') {
        getBatteryPromptShown().then((shown) => {
          if (shown) return;
          setBatteryPromptShown().catch(() => {});
          Alert.alert(
            'הפעלת התרעות ברקע',
            'כדי לקבל התרעות גם כשהאפליקציה סגורה, יש לבטל אופטימיזציית סוללה:\nהגדרות ← אפליקציות ← צבע שקט ← סוללה ← ללא הגבלות',
            [
              {
                text: 'פתח הגדרות',
                onPress: () => Linking.openSettings(),
              },
              { text: 'אחר כך', style: 'cancel' },
            ]
          );
        }).catch(() => {});
      }
    }
  }, []);

  return (
    <SafeAreaProvider>
      <PreferencesProvider>
        <LiveAlertProvider>
          <AlertHistoryProvider>
            <StatusBar style={isDark ? 'light' : 'dark'} />
            <Stack screenOptions={{ headerShown: false }} />
            <OnboardingModal />
          </AlertHistoryProvider>
        </LiveAlertProvider>
      </PreferencesProvider>
    </SafeAreaProvider>
  );
}
