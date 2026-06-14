import { APP_ROUTES } from '@core/config/app.constants';

export interface ReceptionNavItem {
  label: string;
  route: string;
  icon: 'dashboard' | 'clients' | 'abonnements' | 'paiements' | 'presences' | 'seances';
  badge?: number;
}

export const RECEPTION_MENU_NAV: ReceptionNavItem[] = [
  { label: 'Tableau de bord', route: APP_ROUTES.dashboard, icon: 'dashboard' },
  { label: 'Clients', route: APP_ROUTES.clients, icon: 'clients' },
  { label: 'Abonnements', route: APP_ROUTES.abonnements, icon: 'abonnements' },
  { label: 'Paiements', route: APP_ROUTES.paiements, icon: 'paiements' },
  { label: 'Présences', route: APP_ROUTES.presences, icon: 'presences' },
  { label: 'Séances journalières', route: APP_ROUTES.seances, icon: 'seances' },
];
