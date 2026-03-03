/**
 * Normalize a Hebrew city name for comparison.
 * Handles common mismatches between the alarmpy labels source and the
 * Oref history/live API — e.g. "תל אביב - יפו" vs "תל אביב-יפו".
 */
export function normalizeName(s: string): string {
  return s
    .trim()
    .normalize('NFC')
    // Collapse any combination of whitespace + dash/en-dash/em-dash + whitespace → single hyphen
    .replace(/\s*[-\u2013\u2014]\s*/g, '-')
    // Collapse multiple spaces
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

/**
 * Returns true when a single city name from a live alert matches any of the
 * selected cities (with normalization).
 */
export function matchesSingleCity(city: string, selectedCities: string[]): boolean {
  if (selectedCities.length === 0) return true;
  const cn = normalizeName(city);
  return selectedCities.some((sel) => {
    const sn = normalizeName(sel);
    return cn === sn || cn.includes(sn) || sn.includes(cn);
  });
}

/**
 * Returns true when `itemData` (the raw `data` field of a HistoryAlert) contains
 * at least one of the given selected cities.
 *
 * `itemData` may be a single city name or a comma-separated list; we split and
 * check each segment individually.
 */
export function matchesCityFilter(itemData: string, selectedCities: string[]): boolean {
  if (selectedCities.length === 0) return true;

  // Split comma-separated city list and normalize each segment
  const itemCities = itemData
    .split(',')
    .map(normalizeName)
    .filter(Boolean);

  return selectedCities.some((selected) => {
    const sel = normalizeName(selected);
    // Accept if any segment in the item equals OR contains the selected city
    // (bidirectional — handles partial name substrings in either direction)
    return itemCities.some((ic) => ic === sel || ic.includes(sel) || sel.includes(ic));
  });
}
