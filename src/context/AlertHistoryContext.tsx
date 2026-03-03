import React, { createContext, useContext } from 'react';
import { useAlertHistory } from '../hooks/useAlertHistory';
import type { HistoryAlert } from '../types';

interface AlertHistoryContextValue {
  /** Full dataset — use this when a filter is active to search all history */
  allItems: HistoryAlert[];
  /** Current paginated slice — use this for the unfiltered scrollable list */
  displayedItems: HistoryAlert[];
  loading: boolean;
  hasMore: boolean;
  loadMore: () => void;
}

const AlertHistoryContext = createContext<AlertHistoryContextValue | null>(null);

/**
 * Mounts a single useAlertHistory polling instance for the whole app.
 */
export function AlertHistoryProvider({ children }: { children: React.ReactNode }) {
  const value = useAlertHistory();

  return (
    <AlertHistoryContext.Provider value={value}>
      {children}
    </AlertHistoryContext.Provider>
  );
}

export function useAlertHistoryContext(): AlertHistoryContextValue {
  const ctx = useContext(AlertHistoryContext);
  if (!ctx) throw new Error('useAlertHistoryContext must be used within AlertHistoryProvider');
  return ctx;
}
