import { Routes } from '@angular/router';

export const PARAMETRES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/parametres-page/parametres-page.component').then(
        (m) => m.ParametresPageComponent,
      ),
  },
];
