import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';

import { ApiService } from '@core/services/api.service';
import {
  FichePaieRapport,
  GenererFichePaieRequest,
  JournalAuditRapport,
  JournalCaisseRapport,
  JournalClientRapport,
  JournalDepenseRapport,
  MasseSalarialeRapport,
  RapportFilters,
} from '@features/rapports/models/rapport.model';

@Injectable({ providedIn: 'root' })
export class RapportsService {
  private readonly filterKeys = [
    'date_debut',
    'date_fin',
    'mois',
    'annee',
    'statut',
    'employe_id',
    'module',
    'categorie_id',
    'type_paiement',
  ] as const;

  private readonly api = inject(ApiService);

  listFichesPaie(filters?: RapportFilters): Observable<FichePaieRapport[]> {
    return this.api
      .get<FichePaieRapport[]>('rapports/fiches-paie', this.toParams(filters))
      .pipe(map((r) => r.data));
  }

  getMasseSalariale(mois: number, annee: number): Observable<MasseSalarialeRapport> {
    return this.api
      .get<MasseSalarialeRapport>('rapports/fiches-paie/masse-salariale', { mois, annee })
      .pipe(map((r) => r.data));
  }

  genererFichePaie(payload: GenererFichePaieRequest): Observable<FichePaieRapport> {
    return this.api.post<FichePaieRapport>('rh/fiches-paie/generer', payload).pipe(map((r) => r.data));
  }

  marquerFichePayee(ficheId: string): Observable<FichePaieRapport> {
    return this.api.patch<FichePaieRapport>(`rh/fiches-paie/${ficheId}/payer`, {}).pipe(map((r) => r.data));
  }

  downloadFichePdf(ficheId: string): Observable<Blob> {
    return this.api.getBlob(`rapports/fiches-paie/${ficheId}/pdf`);
  }

  listJournalDepenses(filters?: RapportFilters): Observable<JournalDepenseRapport[]> {
    return this.api
      .get<JournalDepenseRapport[]>('rapports/journal-depenses', this.toParams(filters))
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
    return this.api.getBlob(endpoint, this.toParams(filters));
  }

  listCategories(): Observable<{ id: string; nom: string }[]> {
    return this.api.get<{ id: string; nom: string }[]>('finances/categories-depenses').pipe(map((r) => r.data));
  }

  private toParams(
    filters?: RapportFilters & { module?: string },
  ): Record<string, string | number> | undefined {
    if (!filters) return undefined;
    const result: Record<string, string | number> = {};
    for (const key of this.filterKeys) {
      const v = filters[key];
      if (v) result[key] = v;
    }
    return Object.keys(result).length ? result : undefined;
  }
}
