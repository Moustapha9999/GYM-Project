import { Routes } from '@angular/router';

export const FINANCES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/finances-list/finances-list-page.component').then(
        (m) => m.FinancesListPageComponent,
      ),
  },
];
