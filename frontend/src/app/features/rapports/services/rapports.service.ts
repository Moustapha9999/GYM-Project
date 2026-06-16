import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';

import { ApiService } from '@core/services/api.service';
import { environment } from '@env/environment';
import {
  FichePaieRapport,
  JournalAuditRapport,
  JournalCaisseRapport,
  JournalClientRapport,
  RapportFilters,
} from '@features/rapports/models/rapport.model';

@Injectable({ providedIn: 'root' })
export class RapportsService {
  private readonly filterKeys = ['date_debut', 'date_fin', 'module'] as const;

  private readonly api = inject(ApiService);
  private readonly http = inject(HttpClient);

  listFichesPaie(filters?: RapportFilters): Observable<FichePaieRapport[]> {
    return this.api
      .get<FichePaieRapport[]>('rapports/fiches-paie', this.toParams(filters))
      .pipe(map((r) => r.data));
  }

  listJournalAudit(filters?: RapportFilters & { module?: string }): Observable<JournalAuditRapport[]> {
    return this.api
      .get<JournalAuditRapport[]>('rapports/journal-audit', this.toParams(filters))
      .pipe(map((r) => r.data));
  }

  listJournalCaisse(filters?: RapportFilters): Observable<JournalCaisseRapport[]> {
    return this.api
      .get<JournalCaisseRapport[]>('rapports/journal-caisse', this.toParams(filters))
      .pipe(map((r) => r.data));
  }

  listJournalClients(filters?: RapportFilters): Observable<JournalClientRapport[]> {
    return this.api
      .get<JournalClientRapport[]>('rapports/journal-clients', this.toParams(filters))
      .pipe(map((r) => r.data));
  }

  download(endpoint: string, filters?: RapportFilters & { module?: string }): Observable<Blob> {
    return this.http.get(`${environment.apiUrl}/${endpoint}`, {
      params: this.toHttpParams(filters),
      responseType: 'blob',
    });
  }

  private toParams(
    filters?: RapportFilters & { module?: string },
  ): Record<string, string> | undefined {
    if (!filters) return undefined;
    const result: Record<string, string> = {};
    for (const key of this.filterKeys) {
      const v = filters[key];
      if (v) result[key] = v;
    }
    return result;
  }

  private toHttpParams(filters?: RapportFilters & { module?: string }): HttpParams {
    let params = new HttpParams();
    if (!filters) return params;
    for (const key of this.filterKeys) {
      const v = filters[key];
      if (v) params = params.set(key, v);
    }
    return params;
  }
}
