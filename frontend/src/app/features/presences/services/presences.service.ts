import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';

import { ApiService } from '@core/services/api.service';
import {
  EntreeManuellePayload,
  EntreeQRPayload,
  Presence,
  PresenceClientInfo,
  SortiePayload,
} from '@features/presences/models/presence.model';

@Injectable({ providedIn: 'root' })
export class PresencesService {
  private readonly api = inject(ApiService);

  listDuJour(jour?: string): Observable<PresenceClientInfo[]> {
    const params: Record<string, string> = {};
    if (jour) params['jour'] = jour;

    return this.api.get<PresenceClientInfo[]>('presences/jour', params).pipe(map((r) => r.data));
  }

  entreeManuelle(payload: EntreeManuellePayload): Observable<Presence> {
    return this.api.post<Presence>('presences/entree', payload).pipe(map((r) => r.data));
  }

  entreeQr(payload: EntreeQRPayload): Observable<Presence> {
    return this.api.post<Presence>('presences/entree-qr', payload).pipe(map((r) => r.data));
  }

  sortie(payload: SortiePayload): Observable<Presence> {
    return this.api.patch<Presence>('presences/sortie', payload).pipe(map((r) => r.data));
  }
}
