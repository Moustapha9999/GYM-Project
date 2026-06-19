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
  PaiementRead,
  PaiementUpdatePayload,
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

  getById(id: string): Observable<PaiementRead> {
    return this.api.get<PaiementRead>(`paiements/${id}`).pipe(map((response) => response.data));
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

  modifier(id: string, payload: PaiementUpdatePayload): Observable<PaiementRead> {
    return this.api.put<PaiementRead>(`paiements/${id}`, payload).pipe(map((response) => response.data));
  }

  downloadImportTemplate(): Observable<Blob> {
    return this.api.getBlob('paiements/import-modele').pipe(
      map((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'modele_import_paiements.xlsx';
        link.click();
        URL.revokeObjectURL(url);
        return blob;
      }),
    );
  }
}
