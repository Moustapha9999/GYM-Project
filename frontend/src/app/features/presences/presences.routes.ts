import { Routes } from '@angular/router';

import { permissionGuard } from '@core/guards/permission.guard';

export const PRESENCES_ROUTES: Routes = [
  {
    path: '',
    canActivate: [permissionGuard(['presences.lecture'])],
    loadComponent: () =>
      import('./pages/presences-list/presences-list-page.component').then(
        (m) => m.PresencesListPageComponent,
      ),
  },
];
