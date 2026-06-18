import { Routes } from '@angular/router';

import { permissionGuard } from '@core/guards/permission.guard';

export const PARAMETRES_ROUTES: Routes = [
  {
    path: '',
    canActivate: [permissionGuard(['parametres.modification', 'parametres.lecture'])],
    loadComponent: () =>
      import('./pages/parametres-page/parametres-page.component').then(
        (m) => m.ParametresPageComponent,
      ),
  },
];
