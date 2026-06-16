import { Routes } from '@angular/router';

import { permissionGuard } from '@core/guards/permission.guard';

export const RAPPORTS_ROUTES: Routes = [
  {
    path: '',
    canActivate: [
      permissionGuard([
        'rapports.lecture',
        'salaires.lecture',
        'audit.lecture',
        'finances.lecture',
        'clients.lecture',
      ]),
    ],
    loadComponent: () =>
      import('./pages/rapports-page/rapports-page.component').then((m) => m.RapportsPageComponent),
  },
];
