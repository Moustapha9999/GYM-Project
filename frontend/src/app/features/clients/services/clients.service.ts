import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';

import { PaginatedApiResponse } from '@core/models/api-response.model';
import { ApiService } from '@core/services/api.service';

export interface Client {
  id: string;
  numero_membre: string;
  nom: string;
  prenom: string;
  telephone: string;
  sexe?: string;
  actif: boolean;
}

@Injectable({ providedIn: 'root' })
export class ClientsService {
  private readonly api = inject(ApiService);

  list(params?: Record<string, string | number | boolean>): Observable<PaginatedApiResponse<Client>> {
    return this.api.getPaginated<Client>('clients', params);
  }

  getById(id: string): Observable<Client> {
    return this.api.get<Client>(`clients/${id}`).pipe(map((response) => response.data));
  }

  search(query: string): Observable<Client[]> {
    return this.api
      .get<Client[]>('clients/recherche', { q: query })
      .pipe(map((response) => response.data));
  }
}
