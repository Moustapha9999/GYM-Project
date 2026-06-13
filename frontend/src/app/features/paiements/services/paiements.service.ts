import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';

import { PaginatedApiResponse } from '@core/models/api-response.model';
import { ApiService } from '@core/services/api.service';

export interface Paiement {
  id: string;
  montant: number;
  date_paiement: string;
}

export interface MoyenPaiement {
  id: string;
  nom: string;
  code: string;
}

@Injectable({ providedIn: 'root' })
export class PaiementsService {
  private readonly api = inject(ApiService);

  list(params?: Record<string, string | number | boolean>): Observable<PaginatedApiResponse<Paiement>> {
    return this.api.getPaginated<Paiement>('paiements', params);
  }

  getCaisseJour(): Observable<unknown> {
    return this.api.get('paiements/caisse-jour').pipe(map((response) => response.data));
  }

  listMoyensPaiement(): Observable<MoyenPaiement[]> {
    return this.api.get<MoyenPaiement[]>('moyens-paiement').pipe(map((response) => response.data));
  }
}
