import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';

import { AppSettings, AppSettingsUpdate } from '@core/models/app-settings.model';
import { ApiService } from '@core/services/api.service';
import { ThemeService } from '@core/services/theme.service';

@Injectable({ providedIn: 'root' })
export class ParametresService {
  private readonly api = inject(ApiService);
  private readonly theme = inject(ThemeService);

  getSettings(): Observable<AppSettings> {
    return this.api.get<AppSettings>('parametres/app').pipe(map((response) => response.data));
  }

  updateSettings(payload: AppSettingsUpdate): Observable<AppSettings> {
    return this.theme.update(payload);
  }
}
