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
}
