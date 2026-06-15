import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';

import { PaginatedApiResponse } from '@core/models/api-response.model';
import { ApiService } from '@core/services/api.service';
import {
  Client,
  ClientCreatePayload,
  ClientFilters,
  ClientImportResult,
  ClientUpdatePayload,
} from '@features/clients/models/client.model';

@Injectable({ providedIn: 'root' })
export class ClientsService {
  private readonly api = inject(ApiService);

  list(filters?: ClientFilters): Observable<PaginatedApiResponse<Client>> {
    const params: Record<string, string | number | boolean> = {};
    if (filters?.search) params['search'] = filters.search;
    if (filters?.sexe) params['sexe'] = filters.sexe;
    if (filters?.actif !== undefined) params['actif'] = filters.actif;
    if (filters?.page) params['page'] = filters.page;
    if (filters?.per_page) params['per_page'] = filters.per_page;

    return this.api.getPaginated<Client>('clients', params);
  }

  getById(id: string): Observable<Client> {
    return this.api.get<Client>(`clients/${id}`).pipe(map((response) => response.data));
  }

  search(query: string): Observable<Client[]> {
    return this.list({ search: query, per_page: 10 }).pipe(map((response) => response.data));
  }

  create(payload: ClientCreatePayload): Observable<Client> {
    return this.api.post<Client>('clients', payload).pipe(map((response) => response.data));
  }

  update(id: string, payload: ClientUpdatePayload): Observable<Client> {
    return this.api.put<Client>(`clients/${id}`, payload).pipe(map((response) => response.data));
  }

  delete(id: string): Observable<void> {
    return this.api.delete<void>(`clients/${id}`).pipe(map(() => undefined));
  }

  uploadPhoto(id: string, photoBase64: string): Observable<Client> {
    return this.api
      .put<Client>(`clients/${id}/photo`, { photo_base64: photoBase64 })
      .pipe(map((response) => response.data));
  }

  count(filters?: Pick<ClientFilters, 'actif'>): Observable<number> {
    return this.list({ ...filters, page: 1, per_page: 1 }).pipe(map((response) => response.meta.total));
  }

  downloadImportTemplate(): Observable<Blob> {
    return this.api.getBlob('clients/import-modele').pipe(
      map((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'modele_import_clients.xlsx';
        link.click();
        URL.revokeObjectURL(url);
        return blob;
      }),
    );
  }

  importExcel(file: File): Observable<ClientImportResult> {
    return this.api
      .uploadFile<ClientImportResult>('clients/import-excel', file)
      .pipe(map((response) => response.data));
  }
}
