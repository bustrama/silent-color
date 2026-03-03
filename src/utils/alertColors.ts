/**
 * Alert color scheme based on alert type.
 * primary — stroke / text accent
 * soft    — bubble / badge background
 */
export type AlertColors = {
  primary: string;
  soft: string;
};

const TITLE_PATTERNS: [RegExp, AlertColors][] = [
  // Event ended — must be checked before rockets (shares category 1)
  [/הסתיים/,               { primary: '#64748b', soft: '#f1f5f9' }],
  // Imminent / preliminary warning
  [/בדקות הקרובות/,        { primary: '#ca8a04', soft: '#fef9c3' }],
  // Hostile aircraft / UAV
  [/כלי טיס עוין|מזל"ט/,  { primary: '#9333ea', soft: '#f3e8ff' }],
  // Terrorist infiltration
  [/מחבל/,                 { primary: '#f97316', soft: '#fff7ed' }],
  // Rockets and missiles
  [/רקטות|טילים|טיל/,     { primary: '#ef4444', soft: '#fef2f2' }],
  // Earthquake
  [/רעידת אדמה/,           { primary: '#78716c', soft: '#f5f5f4' }],
  // Tsunami
  [/צונאמי/,               { primary: '#2563eb', soft: '#eff6ff' }],
  // Hazmat
  [/חומרים מסוכנים|ביולוגי|כימי/, { primary: '#16a34a', soft: '#f0fdf4' }],
  // Radioactive / nuclear
  [/רדיואקטיבי|גרעיני/,   { primary: '#84cc16', soft: '#f7fee7' }],
  // Drill / exercise
  [/תרגיל/,                { primary: '#6b7280', soft: '#f3f4f6' }],
];

const CATEGORY_COLORS: Record<number, AlertColors> = {
  1:  { primary: '#ef4444', soft: '#fef2f2' },  // rockets
  2:  { primary: '#9333ea', soft: '#f3e8ff' },  // hostile UAV
  3:  { primary: '#78716c', soft: '#f5f5f4' },  // earthquake
  4:  { primary: '#16a34a', soft: '#f0fdf4' },  // hazmat
  5:  { primary: '#f97316', soft: '#fff7ed' },  // infiltration
  6:  { primary: '#2563eb', soft: '#eff6ff' },  // tsunami
  7:  { primary: '#84cc16', soft: '#f7fee7' },  // unconventional weapon
  13: { primary: '#ef4444', soft: '#fef2f2' },  // enemy missile
  20: { primary: '#6b7280', soft: '#f3f4f6' },  // general / drill
};

const DEFAULT_COLORS: AlertColors = { primary: '#f97316', soft: '#fff7ed' };

export function getAlertColors(title: string, category?: number): AlertColors {
  for (const [pattern, colors] of TITLE_PATTERNS) {
    if (pattern.test(title)) return colors;
  }
  if (category != null && CATEGORY_COLORS[category]) {
    return CATEGORY_COLORS[category];
  }
  return DEFAULT_COLORS;
}
