import { Routes } from '@angular/router';

import { permissionGuard } from '@core/guards/permission.guard';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    canActivate: [
      permissionGuard(['utilisateurs.lecture', 'roles.lecture', 'parametres.lecture']),
    ],
    loadComponent: () =>
      import('./pages/admin-page/admin-page.component').then((m) => m.AdminPageComponent),
  },
];
