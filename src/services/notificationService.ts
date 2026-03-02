import { Vibration, Platform } from 'react-native';
import { createAudioPlayer } from 'expo-audio';
import type { AudioPlayer } from 'expo-audio';
import Constants from 'expo-constants';
import type { OrefAlert, SoundSetting } from '../types';

// In Expo Go SDK 53+, expo-notifications auto-registers push tokens at module-load
// time (DevicePushTokenAutoRegistration.fx.js), causing an error we can't suppress
// via useEffect guards. The fix: never import/require expo-notifications in Expo Go.
// Metro only executes a module's side-effects when it is first require()-d at runtime,
// so the conditional require below prevents the push-token error entirely.
const isExpoGo = Constants.appOwnership === 'expo';

type NotificationsModule = typeof import('expo-notifications');

function loadNotificationsModule(): NotificationsModule | null {
  if (isExpoGo) return null;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('expo-notifications') as NotificationsModule;
}

const Notifications = loadNotificationsModule();

// Configure foreground notification appearance (standalone / dev-build only)
if (Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false, // we handle sound manually via expo-audio
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export async function requestNotificationPermissions(): Promise<boolean> {
  if (!Notifications) return false; // Expo Go — skip, no push support
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function scheduleAlertNotification(
  alert: OrefAlert,
  matchedCities: string[]
): Promise<void> {
  if (!Notifications) return; // Expo Go — alerts shown via in-app UI banner instead

  const body =
    matchedCities.length > 0
      ? matchedCities.join(', ')
      : alert.data.join(', ');

  await Notifications.scheduleNotificationAsync({
    content: {
      title: alert.title,
      body,
      sound: false, // handled by expo-audio
      priority: Notifications.AndroidNotificationPriority.MAX,
      color: '#FF0000',
    },
    trigger: null, // fire immediately
  });
}

let audioPlayer: AudioPlayer | null = null;

export async function playAlertSound(setting: SoundSetting): Promise<void> {
  if (setting === 'silent') return;

  if (setting === 'vibrate') {
    Vibration.vibrate([0, 500, 200, 500, 200, 500]);
    return;
  }

  // setting === 'sound'
  try {
    // Release previous player if any
    if (audioPlayer) {
      audioPlayer.remove();
      audioPlayer = null;
    }

    audioPlayer = createAudioPlayer(require('../../assets/sounds/alert.wav'));
    audioPlayer.play();

    // Also vibrate alongside sound
    if (Platform.OS === 'android') {
      Vibration.vibrate([0, 300, 100, 300]);
    }
  } catch {
    // Fallback to vibration if sound fails to load
    Vibration.vibrate([0, 500, 200, 500]);
  }
}

export async function stopAlertSound(): Promise<void> {
  if (audioPlayer) {
    try {
      audioPlayer.pause();
      audioPlayer.remove();
    } catch {
      // ignore
    }
    audioPlayer = null;
  }
}
