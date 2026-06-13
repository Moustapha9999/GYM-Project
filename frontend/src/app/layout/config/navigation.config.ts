import { APP_ROUTES } from '@core/config/app.constants';
import { NavItem } from '@layout/models/nav-item.model';

export const MAIN_NAV_ITEMS: NavItem[] = [
  {
    label: 'Tableau de bord',
    route: APP_ROUTES.dashboard,
    icon: '📊',
  },
  {
    label: 'Clients',
    route: APP_ROUTES.clients,
    icon: '👥',
    permissions: ['clients.lecture'],
  },
  {
    label: 'Abonnements',
    route: APP_ROUTES.abonnements,
    icon: '🎫',
    permissions: ['abonnements.lecture'],
  },
  {
    label: 'Paiements',
    route: APP_ROUTES.paiements,
    icon: '💳',
    permissions: ['paiements.lecture'],
  },
  {
    label: 'Présences',
    route: APP_ROUTES.presences,
    icon: '✅',
    permissions: ['presences.lecture'],
  },
  {
    label: 'Séances journalières',
    route: APP_ROUTES.seances,
    icon: '🏋️',
    permissions: ['seances_journalieres.lecture'],
  },
  {
    label: 'RH & Salaires',
    route: APP_ROUTES.rh,
    icon: '👔',
    permissions: ['employes.lecture', 'salaires.lecture'],
  },
  {
    label: 'Coach',
    route: APP_ROUTES.coach,
    icon: '🎯',
    permissions: ['programmes_sportifs.lecture', 'planning.lecture'],
  },
  {
    label: 'Administration',
    route: APP_ROUTES.admin,
    icon: '⚙️',
    permissions: ['utilisateurs.lecture', 'roles.lecture', 'audit.lecture'],
  },
];
