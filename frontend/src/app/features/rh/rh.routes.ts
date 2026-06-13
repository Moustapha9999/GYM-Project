import { Routes } from '@angular/router';

import { permissionGuard } from '@core/guards/permission.guard';

export const RH_ROUTES: Routes = [
  {
    path: '',
    canActivate: [permissionGuard(['employes.lecture', 'salaires.lecture'])],
    loadComponent: () => import('./pages/rh-page/rh-page.component').then((m) => m.RhPageComponent),
  },
];
