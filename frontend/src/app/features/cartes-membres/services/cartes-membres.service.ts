import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';

import { PaginatedApiResponse } from '@core/models/api-response.model';
import { ApiService } from '@core/services/api.service';
import {
  CarteMembre,
  CarteMembreFilters,
  EnvoiWhatsappResult,
} from '@features/cartes-membres/models/carte-membre.model';

@Injectable({ providedIn: 'root' })
export class CartesMembresService {
  private readonly api = inject(ApiService);

  list(filters?: CarteMembreFilters): Observable<PaginatedApiResponse<CarteMembre>> {
    const params: Record<string, string | number | boolean> = {};
    if (filters?.statut) params['statut'] = filters.statut;
    if (filters?.search) params['search'] = filters.search;
    if (filters?.page) params['page'] = filters.page;
    if (filters?.per_page) params['per_page'] = filters.per_page;

    return this.api.getPaginated<CarteMembre>('cartes-membres', params);
  }

  getById(id: string): Observable<CarteMembre> {
    return this.api.get<CarteMembre>(`cartes-membres/${id}`).pipe(map((r) => r.data));
  }

  downloadPdf(id: string, filename: string): Observable<Blob> {
    return this.api.getBlob(`cartes-membres/${id}/pdf`).pipe(
      map((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
        return blob;
      }),
    );
  }

  envoyerWhatsapp(id: string): Observable<EnvoiWhatsappResult> {
    return this.api
      .post<EnvoiWhatsappResult>(`cartes-membres/${id}/envoyer-whatsapp`, {})
      .pipe(map((r) => r.data));
  }

  count(statut?: string): Observable<number> {
    const params: Record<string, string | number> = { page: 1, per_page: 1 };
    if (statut) params['statut'] = statut;
    return this.list(params).pipe(map((r) => r.meta.total));
  }
}
