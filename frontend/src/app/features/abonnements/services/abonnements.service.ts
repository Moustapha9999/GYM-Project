import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';

import { PaginatedApiResponse } from '@core/models/api-response.model';
import { ApiService } from '@core/services/api.service';
import {
  AbonnementFilters,
  AbonnementListItem,
  AbonnementUpdatePayload,
  Eligibilite,
  SouscriptionPayload,
  SouscriptionResult,
  FormulesTarifs,
  TypeAbonnement,
} from '@features/abonnements/models/abonnement.model';

@Injectable({ providedIn: 'root' })
export class AbonnementsService {
  private readonly api = inject(ApiService);

  list(filters?: AbonnementFilters): Observable<PaginatedApiResponse<AbonnementListItem>> {
    const params: Record<string, string | number | boolean> = {};
    if (filters?.statut) params['statut'] = filters.statut;
    if (filters?.client_id) params['client_id'] = filters.client_id;
    if (filters?.page) params['page'] = filters.page;
    if (filters?.per_page) params['per_page'] = filters.per_page;

    return this.api.getPaginated<AbonnementListItem>('abonnements', params);
  }

  listTypes(): Observable<TypeAbonnement[]> {
    return this.api
      .get<TypeAbonnement[]>('types-abonnements')
      .pipe(map((response) => response.data));
  }

  getFormulesTarifs(): Observable<FormulesTarifs> {
    return this.api
      .get<FormulesTarifs>('abonnements/formules-tarifs')
      .pipe(map((response) => response.data));
  }

  souscrire(payload: SouscriptionPayload): Observable<SouscriptionResult> {
    return this.api
      .post<SouscriptionResult>('abonnements/souscrire', payload)
      .pipe(map((response) => response.data));
  }

  getEligibilite(clientId: string): Observable<Eligibilite> {
    return this.api
      .get<Eligibilite>(`abonnements/client/${clientId}/eligibilite`)
      .pipe(map((response) => response.data));
  }

  suspendre(id: string): Observable<void> {
    return this.api.patch<void>(`abonnements/${id}/suspendre`).pipe(map(() => undefined));
  }

  resilier(id: string): Observable<void> {
    return this.api.patch<void>(`abonnements/${id}/resilier`).pipe(map(() => undefined));
  }

  modifier(id: string, payload: AbonnementUpdatePayload): Observable<AbonnementListItem> {
    return this.api
      .put<AbonnementListItem>(`abonnements/${id}`, payload)
      .pipe(map((response) => response.data));
  }

  supprimer(id: string): Observable<void> {
    return this.api.delete<void>(`abonnements/${id}`).pipe(map(() => undefined));
  }

  count(statut?: string): Observable<number> {
    const params: Record<string, string | number> = { page: 1, per_page: 1 };
    if (statut) params['statut'] = statut;
    return this.list(params).pipe(map((response) => response.meta.total));
  }

  downloadImportTemplate(): Observable<Blob> {
    return this.api.getBlob('abonnements/import-modele').pipe(
      map((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'modele_import_abonnements.xlsx';
        link.click();
        URL.revokeObjectURL(url);
        return blob;
      }),
    );
  }
}
