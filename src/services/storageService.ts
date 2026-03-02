import AsyncStorage from '@react-native-async-storage/async-storage';
import type { UserPreferences, CityLabel } from '../types';

const KEYS = {
  PREFERENCES: '@red_alert/preferences',
  CITIES_CACHE: '@red_alert/cities_cache',
  LAST_ALERT_ID: '@red_alert/last_alert_id',
} as const;

const DEFAULT_PREFERENCES: UserPreferences = {
  selectedCities: [],
  soundSetting: 'sound',
};

export async function getPreferences(): Promise<UserPreferences> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.PREFERENCES);
    if (!raw) return DEFAULT_PREFERENCES;
    return { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export async function savePreferences(
  prefs: Partial<UserPreferences>
): Promise<void> {
  try {
    const current = await getPreferences();
    const updated = { ...current, ...prefs };
    await AsyncStorage.setItem(KEYS.PREFERENCES, JSON.stringify(updated));
  } catch {
    // ignore storage failures
  }
}

export async function getCachedCities(): Promise<CityLabel[] | null> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.CITIES_CACHE);
    if (!raw) return null;
    return JSON.parse(raw) as CityLabel[];
  } catch {
    return null;
  }
}

export async function saveCachedCities(cities: CityLabel[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.CITIES_CACHE, JSON.stringify(cities));
  } catch {
    // ignore storage failures
  }
}

export async function getLastAlertId(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(KEYS.LAST_ALERT_ID);
  } catch {
    return null;
  }
}

export async function saveLastAlertId(id: string): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.LAST_ALERT_ID, id);
  } catch {
    // ignore storage failures
  }
}
