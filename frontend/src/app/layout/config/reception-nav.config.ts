import { APP_ROUTES } from '@core/config/app.constants';
import { AppIconName } from '@shared/components/app-icon/app-icon.types';

export interface ReceptionNavItem {
  labelKey: string;
  route: string;
  icon: AppIconName;
  badge?: number;
}

export const RECEPTION_MENU_NAV: ReceptionNavItem[] = [
  { labelKey: 'nav.dashboard', route: APP_ROUTES.dashboard, icon: 'dashboard' },
  { labelKey: 'nav.clients', route: APP_ROUTES.clients, icon: 'users' },
  { labelKey: 'nav.abonnements', route: APP_ROUTES.abonnements, icon: 'ticket' },
  { labelKey: 'nav.cartesMembres', route: APP_ROUTES.cartesMembres, icon: 'id-card' },
  { labelKey: 'nav.paiements', route: APP_ROUTES.paiements, icon: 'credit-card' },
  { labelKey: 'nav.presences', route: APP_ROUTES.presences, icon: 'user-check' },
  { labelKey: 'nav.seances', route: APP_ROUTES.seances, icon: 'dumbbell' },
];
