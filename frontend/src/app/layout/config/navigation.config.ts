import { APP_ROUTES } from '@core/config/app.constants';
import { AppIconName } from '@shared/components/app-icon/app-icon.types';
import { NavItem } from '@layout/models/nav-item.model';

export const MAIN_NAV_ITEMS: NavItem[] = [
  {
    label: 'Tableau de bord',
    route: APP_ROUTES.dashboard,
    icon: 'dashboard',
  },
  {
    label: 'Clients',
    route: APP_ROUTES.clients,
    icon: 'users',
    permissions: ['clients.lecture'],
  },
  {
    label: 'Abonnements',
    route: APP_ROUTES.abonnements,
    icon: 'ticket',
    permissions: ['abonnements.lecture'],
  },
  {
    label: 'Paiements',
    route: APP_ROUTES.paiements,
    icon: 'credit-card',
    permissions: ['paiements.lecture'],
  },
  {
    label: 'Présences',
    route: APP_ROUTES.presences,
    icon: 'user-check',
    permissions: ['presences.lecture'],
  },
  {
    label: 'Séances journalières',
    route: APP_ROUTES.seances,
    icon: 'dumbbell',
    permissions: ['seances_journalieres.lecture'],
  },
  {
    label: 'RH & Salaires',
    route: APP_ROUTES.rh,
    icon: 'briefcase',
    permissions: ['employes.lecture', 'salaires.lecture'],
  },
  {
    label: 'Coach',
    route: APP_ROUTES.coach,
    icon: 'target',
    permissions: ['programmes_sportifs.lecture', 'planning.lecture'],
  },
  {
    label: 'Administration',
    route: APP_ROUTES.admin,
    icon: 'settings',
    permissions: ['utilisateurs.lecture', 'roles.lecture', 'audit.lecture'],
  },
];
