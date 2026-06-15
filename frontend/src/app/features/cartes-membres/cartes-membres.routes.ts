import { Routes } from '@angular/router';

export const CARTES_MEMBRES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/cartes-membres-list/cartes-membres-list-page.component').then(
        (m) => m.CartesMembresListPageComponent,
      ),
  },
];
