import { Injectable, inject, signal } from '@angular/core';
import { map, Observable, switchMap, tap } from 'rxjs';

import { AppSettings } from '@core/models/app-settings.model';
import { DEFAULT_LANGUAGE, isAppLanguage } from '@core/models/language.model';
import { ApiService } from '@core/services/api.service';
import { TranslationService } from '@core/services/translation.service';

const STORAGE_KEY = 'gym_app_settings';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly api = inject(ApiService);
  private readonly translation = inject(TranslationService);

  readonly settings = signal<AppSettings | null>(this.readCache());

  load(): Observable<AppSettings> {
    return this.api.get<AppSettings>('parametres/app').pipe(
      map((response) => response.data),
      switchMap((settings) =>
        this.translation.initFromSettings(settings.langue).pipe(map(() => settings)),
      ),
      tap((settings) => this.apply(settings)),
    );
  }

  update(payload: Partial<AppSettings>): Observable<AppSettings> {
    return this.api.put<AppSettings>('parametres/app', payload).pipe(
      map((response) => response.data),
      switchMap((settings) =>
        this.translation.initFromSettings(settings.langue).pipe(map(() => settings)),
      ),
      tap((settings) => this.apply(settings)),
    );
  }

  apply(settings: AppSettings): void {
    const lang = isAppLanguage(settings.langue) ? settings.langue : DEFAULT_LANGUAGE;
    settings = { ...settings, langue: lang };
    const root = document.documentElement;
    const isDark = settings.theme_mode === 'dark';
    root.style.setProperty('--color-primary', settings.theme_couleur);
    root.style.setProperty(
      '--color-primary-end',
      this.deriveEndColor(settings.theme_couleur),
    );
    root.style.setProperty(
      '--color-primary-soft',
      isDark
        ? `color-mix(in srgb, ${settings.theme_couleur} 20%, #1e293b)`
        : this.deriveSoftColor(settings.theme_couleur),
    );
    root.style.setProperty(
      '--color-primary-hover',
      this.deriveHoverColor(settings.theme_couleur),
    );
    root.classList.toggle('theme-dark', isDark);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    this.settings.set(settings);
  }

  private readCache(): AppSettings | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const settings = JSON.parse(raw) as AppSettings;
      if (!isAppLanguage(settings.langue)) {
        settings.langue = DEFAULT_LANGUAGE;
      }
      void this.translation.initFromSettings(settings.langue).subscribe();
      this.apply(settings);
      return settings;
    } catch {
      return null;
    }
  }

  private deriveEndColor(hex: string): string {
    return this.mix(hex, '#ffffff', 0.25);
  }

  private deriveSoftColor(hex: string): string {
    return this.mix(hex, '#ffffff', 0.88);
  }

  private deriveHoverColor(hex: string): string {
    return this.mix(hex, '#000000', 0.15);
  }

  private mix(hex: string, target: string, amount: number): string {
    const [r1, g1, b1] = this.hexToRgb(hex);
    const [r2, g2, b2] = this.hexToRgb(target);
    const r = Math.round(r1 + (r2 - r1) * amount);
    const g = Math.round(g1 + (g2 - g1) * amount);
    const b = Math.round(b1 + (b2 - b1) * amount);
    return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
  }

  private hexToRgb(hex: string): [number, number, number] {
    const value = hex.replace('#', '');
    return [
      parseInt(value.slice(0, 2), 16),
      parseInt(value.slice(2, 4), 16),
      parseInt(value.slice(4, 6), 16),
    ];
  }
}
