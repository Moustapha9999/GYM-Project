import { Routes } from '@angular/router';

import { permissionGuard } from '@core/guards/permission.guard';

export const CLIENTS_ROUTES: Routes = [
  {
    path: '',
    canActivate: [permissionGuard(['clients.lecture'])],
    loadComponent: () =>
      import('./pages/clients-list/clients-list-page.component').then(
        (m) => m.ClientsListPageComponent,
      ),
  },
];
