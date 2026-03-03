export interface OrefAlert {
  id: string;
  title: string;
  data: string[]; // Hebrew city names
  cat: string;
  desc: string;
}

export interface HistoryAlert {
  alertDate: string;
  title: string;
  data: string;
  category: number;
  id?: string;
}

export interface CityLabel {
  label: string;  // Hebrew city name
  value: string;
  areaid?: number;
  areaname?: string;
  label_he?: string;
  migun_time?: number;
}

export type SoundSetting = 'sound' | 'vibrate' | 'silent';

export interface UserPreferences {
  selectedCities: string[];
  soundSetting: SoundSetting;
  customSoundUri?: string;
  customSoundName?: string;
  /** When true, only show alerts whose city exactly matches a selected city */
  exactCityMatch?: boolean;
  /** True once the user has completed or dismissed the first-run onboarding */
  onboardingDone?: boolean;
  /** Alert sound volume, 0.0 – 1.0 (default 1.0 = full volume) */
  alertVolume?: number;
  /**
   * Category IDs that are muted (no sound or notification).
   * An empty array (or undefined) means all categories are active.
   */
  mutedAlertCategories?: number[];
}
