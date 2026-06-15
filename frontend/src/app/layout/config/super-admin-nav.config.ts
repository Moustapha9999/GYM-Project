import { APP_ROUTES } from '@core/config/app.constants';

export interface SuperAdminNavItem {
  labelKey: string;
  route: string;
}

export const SUPER_ADMIN_NAV: SuperAdminNavItem[] = [
  { labelKey: 'nav.dashboard', route: APP_ROUTES.dashboard },
  { labelKey: 'nav.paiements', route: APP_ROUTES.paiements },
  { labelKey: 'nav.clients', route: APP_ROUTES.clients },
  { labelKey: 'nav.abonnements', route: APP_ROUTES.abonnements },
  { labelKey: 'nav.cartesMembres', route: APP_ROUTES.cartesMembres },
  { labelKey: 'nav.finances', route: APP_ROUTES.finances },
  { labelKey: 'nav.admin', route: APP_ROUTES.admin },
  { labelKey: 'nav.parametres', route: APP_ROUTES.parametres },
];
