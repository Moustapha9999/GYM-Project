import { Routes } from '@angular/router';

import { permissionGuard } from '@core/guards/permission.guard';

export const FINANCES_ROUTES: Routes = [
  {
    path: '',
    canActivate: [permissionGuard(['finances.lecture'])],
    loadComponent: () =>
      import('./pages/finances-list/finances-list-page.component').then(
        (m) => m.FinancesListPageComponent,
      ),
  },
];
