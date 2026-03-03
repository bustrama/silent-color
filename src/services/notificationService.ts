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
      shouldPlaySound: false, // we handle sound manually via expo-audio (respects our volume)
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  // Android: create a high-priority channel with custom alert sound
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('red-alerts', {
      name: 'התרעות אדומות',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'alert.wav',
      vibrationPattern: [0, 300, 200, 300],
      lightColor: '#FF0000',
    }).catch(() => {});
  }
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
      // 'alert.wav' plays via OS when app is backgrounded; foreground sound handled by expo-audio
      sound: 'alert.wav',
      priority: Notifications.AndroidNotificationPriority.MAX,
      color: '#FF0000',
      // Android: route to our high-priority channel with correct sound
      channelId: 'red-alerts',
    },
    trigger: null, // fire immediately
  });
}

let audioPlayer: AudioPlayer | null = null;

export async function playAlertSound(
  setting: SoundSetting,
  customSoundUri?: string,
  volume = 1.0
): Promise<void> {
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

    const source = customSoundUri
      ? { uri: customSoundUri }
      : require('../../assets/sounds/alert.wav');

    audioPlayer = createAudioPlayer(source);
    // Apply volume (0.0–1.0) — overrides phone media/silent volume via playsInSilentMode
    audioPlayer.volume = Math.min(1, Math.max(0, volume));
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
