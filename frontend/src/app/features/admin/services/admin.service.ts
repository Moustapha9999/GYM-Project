import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';

import { PaginationMeta } from '@core/models/api-response.model';
import { ApiService } from '@core/services/api.service';
import {
  CreateEmployeRequest,
  Employe,
  UpdateEmployeRequest,
} from '@features/admin/models/employe.model';
import {
  CreateUtilisateurRequest,
  Permission,
  Role,
  RoleDetail,
  UpdateUtilisateurRequest,
  Utilisateur,
} from '@features/admin/models/utilisateur.model';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly api = inject(ApiService);

  // ── Utilisateurs ──────────────────────────────────────────
  listUtilisateurs(): Observable<Utilisateur[]> {
    return this.api.get<Utilisateur[]>('utilisateurs').pipe(map((r) => r.data));
  }

  getUtilisateur(id: string): Observable<Utilisateur> {
    return this.api.get<Utilisateur>(`utilisateurs/${id}`).pipe(map((r) => r.data));
  }

  createUtilisateur(payload: CreateUtilisateurRequest): Observable<Utilisateur> {
    return this.api.post<Utilisateur>('utilisateurs', payload).pipe(map((r) => r.data));
  }

  updateUtilisateur(id: string, payload: UpdateUtilisateurRequest): Observable<Utilisateur> {
    return this.api.put<Utilisateur>(`utilisateurs/${id}`, payload).pipe(map((r) => r.data));
  }

  deactivateUtilisateur(id: string): Observable<void> {
    return this.api.delete<void>(`utilisateurs/${id}`).pipe(map(() => undefined));
  }

  // ── Rôles & permissions ───────────────────────────────────
  listRoles(): Observable<Role[]> {
    return this.api.get<Role[]>('roles').pipe(map((r) => r.data));
  }

  getRole(id: string): Observable<RoleDetail> {
    return this.api.get<RoleDetail>(`roles/${id}`).pipe(map((r) => r.data));
  }

  listPermissions(): Observable<Permission[]> {
    return this.api.get<Permission[]>('permissions').pipe(map((r) => r.data));
  }

  updateRolePermissions(roleId: string, permissionIds: string[]): Observable<RoleDetail> {
    return this.api
      .put<RoleDetail>(`roles/${roleId}/permissions`, { permission_ids: permissionIds })
      .pipe(map((r) => r.data));
  }

  // ── Employés (RH) ─────────────────────────────────────────
  listEmployes(params?: {
    search?: string;
    statut?: string;
    fonction?: string;
    page?: number;
    per_page?: number;
  }): Observable<{ data: Employe[]; meta: PaginationMeta }> {
    return this.api.getPaginated<Employe>('rh/employes', params).pipe(
      map((r) => ({ data: r.data, meta: r.meta })),
    );
  }

  getEmploye(id: string): Observable<Employe> {
    return this.api.get<Employe>(`rh/employes/${id}`).pipe(map((r) => r.data));
  }

  createEmploye(payload: CreateEmployeRequest): Observable<Employe> {
    return this.api.post<Employe>('rh/employes', payload).pipe(map((r) => r.data));
  }

  updateEmploye(id: string, payload: UpdateEmployeRequest): Observable<Employe> {
    return this.api.put<Employe>(`rh/employes/${id}`, payload).pipe(map((r) => r.data));
  }

  deleteEmploye(id: string): Observable<void> {
    return this.api.delete<void>(`rh/employes/${id}`).pipe(map(() => undefined));
  }
}
