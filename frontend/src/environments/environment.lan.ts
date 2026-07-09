import { Environment } from './environment.model';

/**
 * Postes B/C sur le réseau local.
 * Machine A (serveur DB) : 192.168.100.6 — apiUrl = backend local sur ce poste (localhost:8000).
 */
export const environment: Environment = {
  production: false,
  appName: 'TOTAL FITNESS',
  apiUrl: 'http://localhost:8000/api/v1',
};
