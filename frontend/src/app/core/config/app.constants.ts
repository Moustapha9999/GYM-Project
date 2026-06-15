export const APP_CONSTANTS = {
  tokenStorageKey: 'gym_sylla_token',
  userStorageKey: 'gym_sylla_user',
  defaultPageSize: 20,
  devise: 'MRU',
} as const;

export const APP_ROUTES = {
  auth: {
    login: '/auth/login',
  },
  dashboard: '/dashboard',
  clients: '/clients',
  abonnements: '/abonnements',
  cartesMembres: '/cartes-membres',
  finances: '/finances',
  paiements: '/paiements',
  presences: '/presences',
  seances: '/seances',
  rh: '/rh',
  coach: '/coach',
  admin: '/admin',
  parametres: '/parametres',
} as const;
