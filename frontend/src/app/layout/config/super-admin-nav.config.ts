import { APP_ROUTES } from '@core/config/app.constants';

export interface SuperAdminNavItem {
  label: string;
  route: string;
}

export const SUPER_ADMIN_NAV: SuperAdminNavItem[] = [
  { label: 'Tableau de bord', route: APP_ROUTES.dashboard },
  { label: 'Paiements', route: APP_ROUTES.paiements },
  { label: 'Clients', route: APP_ROUTES.clients },
  { label: 'Abonnements', route: APP_ROUTES.abonnements },
  { label: 'Administration', route: APP_ROUTES.admin },
];
