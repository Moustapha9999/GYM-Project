import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';

import { PaginatedApiResponse } from '@core/models/api-response.model';
import { ApiService } from '@core/services/api.service';

export interface Presence {
  id: string;
  client_id: string;
  heure_entree: string;
  heure_sortie?: string;
}

@Injectable({ providedIn: 'root' })
export class PresencesService {
  private readonly api = inject(ApiService);

  list(params?: Record<string, string | number | boolean>): Observable<PaginatedApiResponse<Presence>> {
    return this.api.getPaginated<Presence>('presences', params);
  }

  entree(payload: { client_id?: string; qr_code?: string }): Observable<Presence> {
    return this.api.post<Presence>('presences/entree', payload).pipe(map((r) => r.data));
  }

  sortie(id: string): Observable<Presence> {
    return this.api.patch<Presence>(`presences/${id}/sortie`).pipe(map((r) => r.data));
  }
}
