import { useState, useEffect, useCallback } from 'react';
import {
  getPreferences,
  savePreferences,
} from '../services/storageService';
import type { UserPreferences, SoundSetting } from '../types';

const DEFAULT: UserPreferences = {
  selectedCities: [],
  soundSetting: 'sound',
};

export function usePreferences() {
  const [prefs, setPrefs] = useState<UserPreferences>(DEFAULT);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPreferences().then((loaded) => {
      setPrefs(loaded);
      setLoading(false);
    });
  }, []);

  const toggleCity = useCallback((city: string) => {
    setPrefs(prev => {
      const next = prev.selectedCities.includes(city)
        ? prev.selectedCities.filter((c) => c !== city)
        : [...prev.selectedCities, city];
      const updated = { ...prev, selectedCities: next };
      savePreferences({ selectedCities: next });
      return updated;
    });
  }, []);

  const selectAllCities = useCallback((cities: string[]) => {
    setPrefs(prev => {
      const updated = { ...prev, selectedCities: cities };
      savePreferences({ selectedCities: cities });
      return updated;
    });
  }, []);

  const clearCities = useCallback(() => {
    setPrefs(prev => {
      const updated = { ...prev, selectedCities: [] };
      savePreferences({ selectedCities: [] });
      return updated;
    });
  }, []);

  const setSoundSetting = useCallback((soundSetting: SoundSetting) => {
    setPrefs(prev => {
      const updated = { ...prev, soundSetting };
      savePreferences({ soundSetting });
      return updated;
    });
  }, []);

  const setCustomSound = useCallback((uri: string | null, name: string | null) => {
    setPrefs(prev => {
      const updated: UserPreferences = {
        ...prev,
        customSoundUri: uri ?? undefined,
        customSoundName: name ?? undefined,
      };
      savePreferences(updated);
      return updated;
    });
  }, []);

  return {
    prefs,
    loading,
    toggleCity,
    selectAllCities,
    clearCities,
    setSoundSetting,
    setCustomSound,
  };
}
