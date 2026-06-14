import { Routes } from '@angular/router';

export const CLIENTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/clients-list/clients-list-page.component').then(
        (m) => m.ClientsListPageComponent,
      ),
  },
];
