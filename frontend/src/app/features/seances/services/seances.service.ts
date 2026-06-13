import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';

import { ApiService } from '@core/services/api.service';

export interface SeanceJournaliere {
  id: string;
  client_id: string;
  montant: number;
  date_seance: string;
}

@Injectable({ providedIn: 'root' })
export class SeancesService {
  private readonly api = inject(ApiService);

  list(): Observable<SeanceJournaliere[]> {
    return this.api
      .get<SeanceJournaliere[]>('seances-journalieres')
      .pipe(map((response) => response.data));
  }

  encaisser(payload: { client_id: string; moyen_paiement_id: string }): Observable<SeanceJournaliere> {
    return this.api
      .post<SeanceJournaliere>('seances-journalieres', payload)
      .pipe(map((response) => response.data));
  }
}
