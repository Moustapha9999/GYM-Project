import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';

import { PaginatedApiResponse } from '@core/models/api-response.model';
import { ApiService } from '@core/services/api.service';
import {
  BilanFinancier,
  CategorieDepense,
  Depense,
  DepenseCreatePayload,
  DepenseFilters,
  DepenseUpdatePayload,
} from '@features/finances/models/finance.model';

@Injectable({ providedIn: 'root' })
export class FinancesService {
  private readonly api = inject(ApiService);

  listCategories(): Observable<CategorieDepense[]> {
    return this.api
      .get<CategorieDepense[]>('finances/categories-depenses')
      .pipe(map((response) => response.data));
  }

  listDepenses(filters?: DepenseFilters): Observable<PaginatedApiResponse<Depense>> {
    const params: Record<string, string | number | boolean> = {};
    if (filters?.date_debut) params['date_debut'] = filters.date_debut;
    if (filters?.date_fin) params['date_fin'] = filters.date_fin;
    if (filters?.categorie_id) params['categorie_id'] = filters.categorie_id;
    if (filters?.page) params['page'] = filters.page;
    if (filters?.per_page) params['per_page'] = filters.per_page;

    return this.api.getPaginated<Depense>('finances/depenses', params);
  }

  createDepense(payload: DepenseCreatePayload): Observable<Depense> {
    return this.api.post<Depense>('finances/depenses', payload).pipe(map((response) => response.data));
  }

  updateDepense(id: string, payload: DepenseUpdatePayload): Observable<Depense> {
    return this.api
      .put<Depense>(`finances/depenses/${id}`, payload)
      .pipe(map((response) => response.data));
  }

  deleteDepense(id: string): Observable<void> {
    return this.api.delete<void>(`finances/depenses/${id}`).pipe(map(() => undefined));
  }

  getBilan(dateDebut: string, dateFin: string): Observable<BilanFinancier> {
    return this.api
      .get<BilanFinancier>('finances/bilan', { date_debut: dateDebut, date_fin: dateFin })
      .pipe(map((response) => response.data));
  }
}
