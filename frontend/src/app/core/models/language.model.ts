export type AppLanguage = 'fr' | 'en' | 'ar';

export const APP_LANGUAGES: AppLanguage[] = ['fr', 'en', 'ar'];

export const DEFAULT_LANGUAGE: AppLanguage = 'fr';

export function isAppLanguage(value: string | null | undefined): value is AppLanguage {
  return value === 'fr' || value === 'en' || value === 'ar';
}
