import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, of, tap } from 'rxjs';
import { map } from 'rxjs/operators';

import {
  AppLanguage,
  DEFAULT_LANGUAGE,
  isAppLanguage,
} from '@core/models/language.model';

type TranslationTree = Record<string, unknown>;

@Injectable({ providedIn: 'root' })
export class TranslationService {
  private readonly http = inject(HttpClient);

  readonly currentLang = signal<AppLanguage>(DEFAULT_LANGUAGE);
  readonly ready = signal(false);

  private translations = signal<TranslationTree>({});
  private readonly cache = new Map<AppLanguage, TranslationTree>();

  /** Charge les traductions et applique lang/dir sur le document. */
  setLanguage(lang: AppLanguage): Observable<void> {
    const cached = this.cache.get(lang);
    if (cached) {
      this.applyLanguage(lang, cached);
      return of(undefined);
    }

    return this.http.get<TranslationTree>(`/i18n/${lang}.json`).pipe(
      tap((data) => this.cache.set(lang, data)),
      tap((data) => this.applyLanguage(lang, data)),
      map(() => undefined),
    );
  }

  /** Traduit une clé pointée (ex. `nav.dashboard`). */
  translate(key: string, params?: Record<string, string | number>): string {
    const value = this.resolveKey(this.translations(), key);
    if (typeof value !== 'string') {
      return key;
    }
    if (!params) {
      return value;
    }
    return Object.entries(params).reduce(
      (text, [name, paramValue]) => text.replaceAll(`{{${name}}}`, String(paramValue)),
      value,
    );
  }

  /** Initialise depuis les paramètres app (avec repli sur le cache local). */
  initFromSettings(langue: string | undefined): Observable<void> {
    const lang = isAppLanguage(langue) ? langue : DEFAULT_LANGUAGE;
    return this.setLanguage(lang);
  }

  private applyLanguage(lang: AppLanguage, data: TranslationTree): void {
    this.translations.set(data);
    this.currentLang.set(lang);
    this.ready.set(true);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }

  private resolveKey(tree: TranslationTree, key: string): unknown {
    return key.split('.').reduce<unknown>((acc, part) => {
      if (!acc || typeof acc !== 'object') {
        return undefined;
      }
      return (acc as TranslationTree)[part];
    }, tree);
  }
}
