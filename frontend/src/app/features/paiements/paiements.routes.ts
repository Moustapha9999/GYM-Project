import { Routes } from '@angular/router';

export const PAIEMENTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/paiements-list/paiements-list-page.component').then(
        (m) => m.PaiementsListPageComponent,
      ),
  },
];
