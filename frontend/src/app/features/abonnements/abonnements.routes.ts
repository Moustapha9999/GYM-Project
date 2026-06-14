import { Routes } from '@angular/router';

export const ABONNEMENTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/abonnements-list/abonnements-list-page.component').then(
        (m) => m.AbonnementsListPageComponent,
      ),
  },
];
