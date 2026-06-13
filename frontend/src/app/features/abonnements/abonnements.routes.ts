import { Routes } from '@angular/router';

import { permissionGuard } from '@core/guards/permission.guard';

export const ABONNEMENTS_ROUTES: Routes = [
  {
    path: '',
    canActivate: [permissionGuard(['abonnements.lecture'])],
    loadComponent: () =>
      import('./pages/abonnements-list/abonnements-list-page.component').then(
        (m) => m.AbonnementsListPageComponent,
      ),
  },
];
