import { Component, computed, inject } from '@angular/core';

import { AuthService } from '@core/services/auth.service';
import { DashboardPageComponent } from '@features/dashboard/pages/dashboard/dashboard-page.component';
import { SuperAdminDashboardPageComponent } from '@features/dashboard/pages/super-admin-dashboard/super-admin-dashboard-page.component';

@Component({
  selector: 'app-dashboard-shell',
  imports: [DashboardPageComponent, SuperAdminDashboardPageComponent],
  template: `
    @if (isSuperAdmin()) {
      <app-super-admin-dashboard-page />
    } @else {
      <app-dashboard-page />
    }
  `,
})
export class DashboardShellComponent {
  private readonly auth = inject(AuthService);

  readonly isSuperAdmin = computed(() => this.auth.roleName() === 'super_admin');
}
