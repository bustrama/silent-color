import React, { createContext, useContext } from 'react';
import { useLiveAlerts } from '../hooks/useLiveAlerts';
import { usePreferencesContext } from './PreferencesContext';
import type { OrefAlert } from '../types';

interface LiveAlertContextValue {
  currentAlert: OrefAlert | null;
  matchedCities: string[];
}

const LiveAlertContext = createContext<LiveAlertContextValue | null>(null);

/**
 * Mounts a single useLiveAlerts polling instance for the whole app.
 * Must be nested inside PreferencesProvider.
 */
export function LiveAlertProvider({ children }: { children: React.ReactNode }) {
  const { prefs } = usePreferencesContext();
  const value = useLiveAlerts(prefs.selectedCities, prefs.soundSetting, prefs.exactCityMatch ?? false);

  return (
    <LiveAlertContext.Provider value={value}>
      {children}
    </LiveAlertContext.Provider>
  );
}

export function useLiveAlertContext(): LiveAlertContextValue {
  const ctx = useContext(LiveAlertContext);
  if (!ctx) throw new Error('useLiveAlertContext must be used within LiveAlertProvider');
  return ctx;
}
