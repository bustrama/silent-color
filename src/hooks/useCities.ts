import { useState, useEffect } from 'react';
import { fetchCities } from '../services/alertService';
import { getCachedCities, saveCachedCities } from '../services/storageService';
import type { CityLabel } from '../types';

export function useCities() {
  const [cities, setCities] = useState<CityLabel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      // Try cache first for instant display
      const cached = await getCachedCities();
      if (cached && cached.length > 0) {
        setCities(cached);
        setLoading(false);
      }

      // Always refresh from network
      const fresh = await fetchCities();
      if (fresh.length > 0) {
        setCities(fresh);
        await saveCachedCities(fresh);
      }
      setLoading(false);
    }

    load();
  }, []);

  return { cities, loading };
}
