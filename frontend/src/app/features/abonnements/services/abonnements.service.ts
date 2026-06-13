import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';

import { ApiService } from '@core/services/api.service';

export interface TypeAbonnement {
  id: string;
  nom: string;
  duree_jours: number;
  montant: number;
}

@Injectable({ providedIn: 'root' })
export class AbonnementsService {
  private readonly api = inject(ApiService);

  listTypes(): Observable<TypeAbonnement[]> {
    return this.api
      .get<TypeAbonnement[]>('types-abonnements')
      .pipe(map((response) => response.data));
  }

  renouveler(payload: {
    client_id: string;
    type_abonnement_id: string;
    moyen_paiement_id: string;
  }): Observable<unknown> {
    return this.api.post('abonnements/renouveler', payload).pipe(map((response) => response.data));
  }
}
