import axios from 'axios';
import type { OrefAlert, HistoryAlert, CityLabel } from '../types';

const OREF_HEADERS = {
  'X-Requested-With': 'XMLHttpRequest',
  Referer: 'https://www.oref.org.il/',
};

const orefClient = axios.create({
  headers: OREF_HEADERS,
  timeout: 5000,
});

const LIVE_URL =
  'https://www.oref.org.il/WarningMessages/alerts.json';
const HISTORY_URL =
  'https://www.oref.org.il/warningMessages/alert/History/AlertsHistory.json';
const CITIES_URL =
  'https://raw.githubusercontent.com/yuvadm/alarmpy/refs/heads/main/alarmpy/data/labels.json';

// Seen alert IDs for deduplication within a session
const seenAlertIds = new Set<string>();

export async function fetchLiveAlerts(): Promise<OrefAlert | null> {
  try {
    const response = await orefClient.get<OrefAlert | null | ''>(LIVE_URL);
    const data = response.data;

    // OREF returns null, empty string, or empty object when no active alert
    if (!data || typeof data !== 'object' || !data.data?.length) {
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

export async function fetchAlertHistory(): Promise<HistoryAlert[]> {
  try {
    const response = await orefClient.get<HistoryAlert[]>(HISTORY_URL);
    if (!Array.isArray(response.data)) return [];
    return response.data;
  } catch {
    return [];
  }
}

export async function fetchCities(): Promise<CityLabel[]> {
  try {
    const response = await axios.get<Record<string, CityLabel>>(CITIES_URL, {
      timeout: 10000,
    });
    const raw = response.data;
    if (!raw || typeof raw !== 'object') return [];

    return Object.entries(raw).map(([value, city]) => ({
      ...city,
      value: city.value ?? value,
      label: city.label ?? value,
    }));
  } catch {
    return [];
  }
}

/**
 * Returns true if this alert is new (not seen in this session).
 * Updates the seen set as a side effect.
 */
export function isNewAlert(alert: OrefAlert): boolean {
  const key = `${alert.id}-${alert.data.join(',')}`;
  if (seenAlertIds.has(key)) return false;
  seenAlertIds.add(key);
  return true;
}

/**
 * Pre-seeds the seen-alert Set from a persisted key.
 * Call on app mount to prevent re-firing the last alert after a cold start.
 */
export function seedSeenAlertId(key: string): void {
  seenAlertIds.add(key);
}
