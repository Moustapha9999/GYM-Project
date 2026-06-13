import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';

import { ApiService } from '@core/services/api.service';

export interface DashboardKpis {
  [key: string]: number | string;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly api = inject(ApiService);

  getAdminDashboard(): Observable<DashboardKpis> {
    return this.api.get<DashboardKpis>('dashboard/admin').pipe(map((response) => response.data));
  }

  getReceptionDashboard(): Observable<DashboardKpis> {
    return this.api
      .get<DashboardKpis>('dashboard/reception')
      .pipe(map((response) => response.data));
  }

  getCoachDashboard(): Observable<DashboardKpis> {
    return this.api.get<DashboardKpis>('dashboard/coach').pipe(map((response) => response.data));
  }
}
