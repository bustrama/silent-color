export const Colors = {
  // Calm / primary
  primary: '#38bdf8',
  primaryDark: '#0ea5e9',
  calmTeal: '#2dd4bf',
  calmTealDark: '#14b8a6',
  mutedTeal: '#5F8D8B',
  mutedTealSoft: '#E0F2F1',

  // Alert state — orange, not red
  alertOrange: '#fb923c',
  alertOrangeDark: '#f97316',

  // Backgrounds
  bgLight: '#f0f9ff',
  bgDark: '#0f172a',
  surfaceLight: '#ffffff',
  surfaceDark: '#1e293b',

  // Text
  textMain: '#334155',
  textMuted: '#64748b',

  // Utility
  border: '#e2e8f0',
  borderDark: '#1e293b',
  success: '#22c55e',

  // Map preview card background
  mapCardBg: '#1e3a5f',
} as const;

export const DarkColors: typeof Colors = {
  // Calm / primary — same vivid accents
  primary: '#38bdf8',
  primaryDark: '#0ea5e9',
  calmTeal: '#2dd4bf',
  calmTealDark: '#14b8a6',
  mutedTeal: '#5eead4',
  mutedTealSoft: '#134e4a',

  // Alert state — unchanged
  alertOrange: '#fb923c',
  alertOrangeDark: '#f97316',

  // Backgrounds — dark navy
  bgLight: '#0f172a',
  bgDark: '#020617',
  surfaceLight: '#1e293b',
  surfaceDark: '#0f172a',

  // Text — near-white
  textMain: '#f1f5f9',
  textMuted: '#94a3b8',

  // Utility
  border: '#334155',
  borderDark: '#475569',
  success: '#22c55e',

  // Map preview card background
  mapCardBg: '#0f2744',
} as const;

export type AppColors = typeof Colors;
