import { Routes } from '@angular/router';

import { authGuard } from '@core/guards/auth.guard';
import { guestGuard } from '@core/guards/guest.guard';

export const routes: Routes = [
  {
    path: 'auth',
    canActivate: [guestGuard],
    loadChildren: () => import('@features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('@layout/components/main-layout/main-layout.component').then(
        (m) => m.MainLayoutComponent,
      ),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadChildren: () =>
          import('@features/dashboard/dashboard.routes').then((m) => m.DASHBOARD_ROUTES),
      },
      {
        path: 'clients',
        loadChildren: () =>
          import('@features/clients/clients.routes').then((m) => m.CLIENTS_ROUTES),
      },
      {
        path: 'abonnements',
        loadChildren: () =>
          import('@features/abonnements/abonnements.routes').then((m) => m.ABONNEMENTS_ROUTES),
      },
      {
        path: 'cartes-membres',
        loadChildren: () =>
          import('@features/cartes-membres/cartes-membres.routes').then((m) => m.CARTES_MEMBRES_ROUTES),
      },
      {
        path: 'finances',
        loadChildren: () =>
          import('@features/finances/finances.routes').then((m) => m.FINANCES_ROUTES),
      },
      {
        path: 'paiements',
        loadChildren: () =>
          import('@features/paiements/paiements.routes').then((m) => m.PAIEMENTS_ROUTES),
      },
      {
        path: 'presences',
        loadChildren: () =>
          import('@features/presences/presences.routes').then((m) => m.PRESENCES_ROUTES),
      },
      {
        path: 'seances',
        loadChildren: () =>
          import('@features/seances/seances.routes').then((m) => m.SEANCES_ROUTES),
      },
      {
        path: 'rh',
        loadChildren: () => import('@features/rh/rh.routes').then((m) => m.RH_ROUTES),
      },
      {
        path: 'coach',
        loadChildren: () => import('@features/coach/coach.routes').then((m) => m.COACH_ROUTES),
      },
      {
        path: 'admin',
        loadChildren: () => import('@features/admin/admin.routes').then((m) => m.ADMIN_ROUTES),
      },
      {
        path: 'parametres',
        loadChildren: () =>
          import('@features/parametres/parametres.routes').then((m) => m.PARAMETRES_ROUTES),
      },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
