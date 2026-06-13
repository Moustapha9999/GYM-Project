import { Routes } from '@angular/router';

import { permissionGuard } from '@core/guards/permission.guard';

export const PAIEMENTS_ROUTES: Routes = [
  {
    path: '',
    canActivate: [permissionGuard(['paiements.lecture'])],
    loadComponent: () =>
      import('./pages/paiements-list/paiements-list-page.component').then(
        (m) => m.PaiementsListPageComponent,
      ),
  },
];
