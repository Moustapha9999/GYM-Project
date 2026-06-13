import { Routes } from '@angular/router';

import { permissionGuard } from '@core/guards/permission.guard';

export const SEANCES_ROUTES: Routes = [
  {
    path: '',
    canActivate: [permissionGuard(['seances_journalieres.lecture'])],
    loadComponent: () =>
      import('./pages/seances-list/seances-list-page.component').then(
        (m) => m.SeancesListPageComponent,
      ),
  },
];
