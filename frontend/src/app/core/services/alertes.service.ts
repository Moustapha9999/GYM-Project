import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';

import { AlertesDashboard } from '@core/models/alerte.model';
import { ApiService } from '@core/services/api.service';

@Injectable({ providedIn: 'root' })
export class AlertesService {
  private readonly api = inject(ApiService);
  private readonly dismissedKey = 'gym_sylla_dismissed_alerts';

  list(limit = 30): Observable<AlertesDashboard> {
    return this.api
      .get<AlertesDashboard>('dashboard/alertes', { limit })
      .pipe(map((response) => response.data));
  }

  getDismissedIds(): Set<string> {
    try {
      const raw = localStorage.getItem(this.dismissedKey);
      if (!raw) return new Set();
      return new Set(JSON.parse(raw) as string[]);
    } catch {
      return new Set();
    }
  }

  dismiss(id: string): void {
    const dismissed = this.getDismissedIds();
    dismissed.add(id);
    localStorage.setItem(this.dismissedKey, JSON.stringify([...dismissed]));
  }

  dismissAll(ids: string[]): void {
    const dismissed = this.getDismissedIds();
    ids.forEach((id) => dismissed.add(id));
    localStorage.setItem(this.dismissedKey, JSON.stringify([...dismissed]));
  }

  clearDismissed(): void {
    localStorage.removeItem(this.dismissedKey);
  }
}
