import { Routes } from '@angular/router';

export const DASHBOARD_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/dashboard-shell/dashboard-shell.component').then(
        (m) => m.DashboardShellComponent,
      ),
  },
];
