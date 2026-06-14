import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';

import { ApiService } from '@core/services/api.service';
import {
  CaisseJour,
  MoyenPaiement,
  PaiementCreatePayload,
  PaiementCreateResult,
  PaiementDetail,
  PaiementFilters,
} from '@features/paiements/models/paiement.model';

@Injectable({ providedIn: 'root' })
export class PaiementsService {
  private readonly api = inject(ApiService);

  listJournal(filters?: PaiementFilters): Observable<PaiementDetail[]> {
    const params: Record<string, string> = {};
    if (filters?.date_debut) params['date_debut'] = filters.date_debut;
    if (filters?.date_fin) params['date_fin'] = filters.date_fin;
    if (filters?.moyen_paiement_id) params['moyen_paiement_id'] = filters.moyen_paiement_id;
    if (filters?.type_paiement) params['type_paiement'] = filters.type_paiement;

    return this.api
      .get<PaiementDetail[]>('paiements', params)
      .pipe(map((response) => response.data));
  }

  getCaisseJour(jour?: string): Observable<CaisseJour> {
    const params = jour ? { jour } : undefined;
    return this.api
      .get<CaisseJour>('paiements/caisse-jour', params)
      .pipe(map((response) => response.data));
  }

  listMoyensPaiement(): Observable<MoyenPaiement[]> {
    return this.api
      .get<MoyenPaiement[]>('paiements/moyens-paiement')
      .pipe(map((response) => response.data));
  }

  create(payload: PaiementCreatePayload): Observable<PaiementCreateResult> {
    return this.api
      .post<PaiementCreateResult>('paiements', payload)
      .pipe(map((response) => response.data));
  }
}
