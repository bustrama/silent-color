import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchAlertHistory } from '../services/alertService';
import type { HistoryAlert } from '../types';

const POLL_INTERVAL_MS = 10_000;
const PAGE_SIZE = 20;

export function useAlertHistory() {
  const allItemsRef = useRef<HistoryAlert[]>([]);
  const pageRef = useRef(1);
  const [displayedItems, setDisplayedItems] = useState<HistoryAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);

  function applyPage(all: HistoryAlert[], page: number) {
    const sliced = all.slice(0, page * PAGE_SIZE);
    setDisplayedItems(sliced);
    setHasMore(sliced.length < all.length);
  }

  useEffect(() => {
    let active = true;

    async function load() {
      const history = await fetchAlertHistory();
      if (!active) return;
      allItemsRef.current = history;
      // Preserve the current scroll page — don't reset on background poll
      applyPage(history, pageRef.current);
      setLoading(false);
    }

    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const loadMore = useCallback(() => {
    const nextPage = pageRef.current + 1;
    pageRef.current = nextPage;
    applyPage(allItemsRef.current, nextPage);
  }, []);

  return { displayedItems, loading, hasMore, loadMore };
}
