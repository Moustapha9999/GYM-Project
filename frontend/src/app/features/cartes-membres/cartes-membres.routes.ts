import { Routes } from '@angular/router';

import { permissionGuard } from '@core/guards/permission.guard';

export const CARTES_MEMBRES_ROUTES: Routes = [
  {
    path: '',
    canActivate: [permissionGuard(['cartes_membres.lecture'])],
    loadComponent: () =>
      import('./pages/cartes-membres-list/cartes-membres-list-page.component').then(
        (m) => m.CartesMembresListPageComponent,
      ),
  },
];
