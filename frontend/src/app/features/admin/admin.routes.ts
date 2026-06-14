import { Routes } from '@angular/router';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/admin-page/admin-page.component').then((m) => m.AdminPageComponent),
  },
];
