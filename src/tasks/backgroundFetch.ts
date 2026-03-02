import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
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
    const matchedCities =
      prefs.selectedCities.length > 0
        ? alert.data.filter((city) => prefs.selectedCities.includes(city))
        : alert.data;

    if (prefs.selectedCities.length > 0 && matchedCities.length === 0) {
      return BackgroundTask.BackgroundTaskResult.Success;
    }

    await scheduleAlertNotification(alert, matchedCities);
    await playAlertSound(prefs.soundSetting);

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
