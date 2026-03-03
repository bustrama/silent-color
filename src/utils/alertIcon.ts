/**
 * Returns an appropriate emoji for an Oref alert.
 *
 * Title-keyword matching takes priority over category numbers because
 * sub-types like "האירוע הסתיים" share a category with their active
 * counterparts and need a distinct icon.
 */

const TITLE_PATTERNS: [RegExp, string][] = [
  // Event ended — check before rockets so "הסתיים" always wins
  [/הסתיים/, '✅'],
  // Imminent / preliminary warning
  [/בדקות הקרובות/, '⏰'],
  // Rockets and missiles
  [/רקטות|טילים|טיל/, '🚀'],
  // Hostile aircraft / UAV
  [/כלי טיס עוין|מזל"ט/, '✈️'],
  // Terrorist infiltration
  [/מחבל/, '🔫'],
  // Earthquake
  [/רעידת אדמה/, '🌍'],
  // Tsunami
  [/צונאמי/, '🌊'],
  // Hazmat / unconventional
  [/חומרים מסוכנים|ביולוגי|כימי/, '☣️'],
  // Radioactive
  [/רדיואקטיבי|גרעיני/, '☢️'],
  // Drill / exercise
  [/תרגיל/, '🔔'],
];

const CATEGORY_ICONS: Record<number, string> = {
  1: '🚀',  // ירי רקטות וטילים
  2: '✈️',  // חדירת כלי טיס עוין
  3: '🌍',  // רעידת אדמה
  4: '☣️',  // אירוע חומרים מסוכנים
  5: '🔫',  // חדירת מחבלים
  6: '🌊',  // צונאמי
  7: '☢️',  // נשק לא קונבנציונלי
  13: '🚀', // טיל ממדינה עוינת
  20: '🔔', // כללי / תרגיל
};

/**
 * @param title   Alert title in Hebrew (OrefAlert.title or HistoryAlert.title)
 * @param category Numeric category (HistoryAlert.category or parseInt(OrefAlert.cat))
 */
export function getAlertIcon(title: string, category?: number): string {
  for (const [pattern, icon] of TITLE_PATTERNS) {
    if (pattern.test(title)) return icon;
  }
  if (category != null) {
    const icon = CATEGORY_ICONS[category];
    if (icon) return icon;
  }
  return '⚠️';
}
