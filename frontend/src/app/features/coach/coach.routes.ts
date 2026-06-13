import { Routes } from '@angular/router';

import { permissionGuard } from '@core/guards/permission.guard';

export const COACH_ROUTES: Routes = [
  {
    path: '',
    canActivate: [permissionGuard(['programmes_sportifs.lecture', 'planning.lecture'])],
    loadComponent: () =>
      import('./pages/coach-page/coach-page.component').then((m) => m.CoachPageComponent),
  },
];
