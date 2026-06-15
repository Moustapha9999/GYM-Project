export interface AppSettings {
  nom_salle: string;
  slogan: string;
  logo_url: string | null;
  theme_couleur: string;
  theme_mode: 'light' | 'dark';
  langue: 'fr' | 'en' | 'ar';
}

export interface AppSettingsUpdate {
  nom_salle?: string;
  slogan?: string;
  logo_url?: string | null;
  theme_couleur?: string;
  theme_mode?: 'light' | 'dark';
  langue?: 'fr' | 'en' | 'ar';
}

export interface ThemePreset {
  id: string;
  labelKey: string;
  couleur: string;
}

export const THEME_PRESETS: ThemePreset[] = [
  { id: 'orange', labelKey: 'parametres.presets.orange', couleur: '#ea580c' },
  { id: 'green', labelKey: 'parametres.presets.green', couleur: '#0d5c3b' },
  { id: 'blue', labelKey: 'parametres.presets.blue', couleur: '#2563eb' },
  { id: 'purple', labelKey: 'parametres.presets.purple', couleur: '#7c3aed' },
  { id: 'red', labelKey: 'parametres.presets.red', couleur: '#dc2626' },
];
