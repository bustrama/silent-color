import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { setAudioModeAsync } from 'expo-audio';
import { fetchLiveAlerts } from '../services/alertService';
import {
  scheduleAlertNotification,
  playAlertSound,
} from '../services/notificationService';
import {
  getPreferences,
  getLastAlertId,
  saveLastAlertId,
} from '../services/storageService';
import { matchesSingleCity } from '../utils/cityFilter';

export const BACKGROUND_FETCH_TASK = 'RED_ALERT_BACKGROUND_FETCH';

TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  try {
    const alert = await fetchLiveAlerts();
    if (!alert) return BackgroundTask.BackgroundTaskResult.Success;

    const lastId = await getLastAlertId();
    const alertKey = `${alert.id}-${alert.data.join(',')}`;
    if (lastId === alertKey) {
      return BackgroundTask.BackgroundTaskResult.Success;
    }

    await saveLastAlertId(alertKey);

    const prefs = await getPreferences();

    // Use the same normalization logic as the foreground hook to avoid
    // missing alerts due to Hebrew name variants (e.g. "תל אביב - יפו" vs "תל אביב-יפו")
    const matchedCities =
      prefs.selectedCities.length > 0
        ? alert.data.filter((city) =>
            matchesSingleCity(city, prefs.selectedCities, prefs.exactCityMatch ?? false)
          )
        : alert.data;

    if (prefs.selectedCities.length > 0 && matchedCities.length === 0) {
      return BackgroundTask.BackgroundTaskResult.Success;
    }

    // Skip sound/notification if this alert category is muted
    const catId = parseInt(alert.cat, 10);
    const mutedCategories = prefs.mutedAlertCategories ?? [];
    if (!isNaN(catId) && mutedCategories.includes(catId)) {
      return BackgroundTask.BackgroundTaskResult.Success;
    }

    await scheduleAlertNotification(alert, matchedCities);

    // Configure audio session in the background JS runtime — _layout.tsx only sets
    // this in the foreground runtime, so the background context needs its own call.
    await setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true }).catch(() => {});
    await playAlertSound(
      prefs.soundSetting,
      prefs.customSoundUri,
      prefs.alertVolume ?? 1.0
    );

    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

export async function registerBackgroundFetch(): Promise<void> {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(
      BACKGROUND_FETCH_TASK
    );
    if (isRegistered) return;

    await BackgroundTask.registerTaskAsync(BACKGROUND_FETCH_TASK, {
      minimumInterval: 15, // minutes — iOS enforces OS-level minimum (~15 min)
    });
  } catch {
    // Background task not supported on this platform/configuration
  }
}

export async function unregisterBackgroundFetch(): Promise<void> {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(
      BACKGROUND_FETCH_TASK
    );
    if (!isRegistered) return;
    await BackgroundTask.unregisterTaskAsync(BACKGROUND_FETCH_TASK);
  } catch {
    // ignore
  }
}
