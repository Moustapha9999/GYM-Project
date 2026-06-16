import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';

import { PaginatedApiResponse } from '@core/models/api-response.model';
import { ApiService } from '@core/services/api.service';
import {
  CoachLight,
  Planning,
  PlanningCreatePayload,
  PlanningFilters,
  PlanningUpdatePayload,
  Programme,
  ProgrammeCreatePayload,
  ProgrammeFilters,
  ProgrammeUpdatePayload,
} from '@features/coach/models/coach.model';

@Injectable({ providedIn: 'root' })
export class CoachService {
  private readonly api = inject(ApiService);

  // ── Coachs ────────────────────────────────────────────────
  listCoachs(): Observable<CoachLight[]> {
    return this.api.get<CoachLight[]>('coach/coachs').pipe(map((r) => r.data));
  }

  // ── Planning ──────────────────────────────────────────────
  listPlanning(filters?: PlanningFilters): Observable<PaginatedApiResponse<Planning>> {
    const params: Record<string, string | number | boolean> = {};
    if (filters?.coach_id) params['coach_id'] = filters.coach_id;
    if (filters?.jour) params['jour'] = filters.jour;
    if (filters?.page) params['page'] = filters.page;
    if (filters?.per_page) params['per_page'] = filters.per_page;

    return this.api.getPaginated<Planning>('coach/planning', params);
  }

  createPlanning(payload: PlanningCreatePayload): Observable<Planning> {
    return this.api.post<Planning>('coach/planning', payload).pipe(map((r) => r.data));
  }

  updatePlanning(id: string, payload: PlanningUpdatePayload): Observable<Planning> {
    return this.api.put<Planning>(`coach/planning/${id}`, payload).pipe(map((r) => r.data));
  }

  deletePlanning(id: string): Observable<void> {
    return this.api.delete<void>(`coach/planning/${id}`).pipe(map(() => undefined));
  }

  // ── Programmes sportifs ───────────────────────────────────
  listProgrammes(filters?: ProgrammeFilters): Observable<PaginatedApiResponse<Programme>> {
    const params: Record<string, string | number | boolean> = {};
    if (filters?.client_id) params['client_id'] = filters.client_id;
    if (filters?.coach_id) params['coach_id'] = filters.coach_id;
    if (filters?.actif !== undefined) params['actif'] = filters.actif;
    if (filters?.page) params['page'] = filters.page;
    if (filters?.per_page) params['per_page'] = filters.per_page;

    return this.api.getPaginated<Programme>('coach/programmes-sportifs', params);
  }

  createProgramme(payload: ProgrammeCreatePayload): Observable<Programme> {
    return this.api
      .post<Programme>('coach/programmes-sportifs', payload)
      .pipe(map((r) => r.data));
  }

  updateProgramme(id: string, payload: ProgrammeUpdatePayload): Observable<Programme> {
    return this.api
      .put<Programme>(`coach/programmes-sportifs/${id}`, payload)
      .pipe(map((r) => r.data));
  }

  deleteProgramme(id: string): Observable<void> {
    return this.api.delete<void>(`coach/programmes-sportifs/${id}`).pipe(map(() => undefined));
  }
}
