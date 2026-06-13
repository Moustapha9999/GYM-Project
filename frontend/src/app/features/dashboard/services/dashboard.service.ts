import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';

import { ApiService } from '@core/services/api.service';
import { AdminDashboardData } from '@features/dashboard/models/admin-dashboard.model';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly api = inject(ApiService);

  getAdminDashboard(): Observable<AdminDashboardData> {
    return this.api
      .get<AdminDashboardData>('dashboard/admin')
      .pipe(map((response) => response.data));
  }

  getReceptionDashboard(): Observable<Record<string, number | string>> {
    return this.api
      .get<Record<string, number | string>>('dashboard/reception')
      .pipe(map((response) => response.data));
  }

  getCoachDashboard(): Observable<Record<string, number | string>> {
    return this.api
      .get<Record<string, number | string>>('dashboard/coach')
      .pipe(map((response) => response.data));
  }
}
