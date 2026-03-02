import React, { createContext, useContext } from 'react';
import { usePreferences } from '../hooks/usePreferences';
import type { SoundSetting, UserPreferences } from '../types';

interface PreferencesContextValue {
  prefs: UserPreferences;
  loading: boolean;
  toggleCity: (city: string) => Promise<void>;
  selectAllCities: (cities: string[]) => Promise<void>;
  clearCities: () => Promise<void>;
  setSoundSetting: (setting: SoundSetting) => Promise<void>;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const value = usePreferences();
  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferencesContext(): PreferencesContextValue {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error('usePreferencesContext must be used within PreferencesProvider');
  return ctx;
}
