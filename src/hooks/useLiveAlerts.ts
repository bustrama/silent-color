import { useState, useEffect, useRef } from 'react';
import { fetchLiveAlerts, isNewAlert, seedSeenAlertId } from '../services/alertService';
import {
  scheduleAlertNotification,
  playAlertSound,
} from '../services/notificationService';
import { saveLastAlertId, getLastAlertId } from '../services/storageService';
import type { OrefAlert, SoundSetting } from '../types';

const POLL_INTERVAL_MS = 1000;

export function useLiveAlerts(
  selectedCities: string[],
  soundSetting: SoundSetting
) {
  const [currentAlert, setCurrentAlert] = useState<OrefAlert | null>(null);
  const [matchedCities, setMatchedCities] = useState<string[]>([]);
  const soundSettingRef = useRef(soundSetting);
  const selectedCitiesRef = useRef(selectedCities);

  // Keep refs in sync so interval closure has latest values
  useEffect(() => {
    soundSettingRef.current = soundSetting;
  }, [soundSetting]);

  useEffect(() => {
    selectedCitiesRef.current = selectedCities;
  }, [selectedCities]);

  // Pre-seed the deduplication set from storage to prevent re-firing
  // the last alert after a cold start (foreground/background sync)
  useEffect(() => {
    getLastAlertId().then((id) => {
      if (id) seedSeenAlertId(id);
    });
  }, []);

  useEffect(() => {
    let active = true;

    async function poll() {
      const alert = await fetchLiveAlerts();

      if (!active) return;

      if (!alert) {
        setCurrentAlert(null);
        setMatchedCities([]);
        return;
      }

      setCurrentAlert(alert);

      const cities = selectedCitiesRef.current;
      const matched =
        cities.length > 0
          ? alert.data.filter((c) => cities.includes(c))
          : alert.data;
      setMatchedCities(matched);

      // Only notify/sound for genuinely new alerts
      if (isNewAlert(alert)) {
        const alertKey = `${alert.id}-${alert.data.join(',')}`;
        await saveLastAlertId(alertKey);

        const shouldNotify = cities.length === 0 || matched.length > 0;
        if (shouldNotify) {
          await scheduleAlertNotification(alert, matched);
          await playAlertSound(soundSettingRef.current);
        }
      }
    }

    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  return { currentAlert, matchedCities };
}
