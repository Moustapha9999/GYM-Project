import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';

import { ApiService } from '@core/services/api.service';
import {
  CreateUtilisateurRequest,
  Role,
  Utilisateur,
} from '@features/admin/models/utilisateur.model';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly api = inject(ApiService);

  listUtilisateurs(): Observable<Utilisateur[]> {
    return this.api.get<Utilisateur[]>('utilisateurs').pipe(map((r) => r.data));
  }

  listRoles(): Observable<Role[]> {
    return this.api.get<Role[]>('roles').pipe(map((r) => r.data));
  }

  createUtilisateur(payload: CreateUtilisateurRequest): Observable<Utilisateur> {
    return this.api.post<Utilisateur>('utilisateurs', payload).pipe(map((r) => r.data));
  }
}
