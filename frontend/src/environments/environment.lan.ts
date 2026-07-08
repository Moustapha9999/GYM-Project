import { Environment } from './environment.model';

/**
 * Postes B/C sur le réseau local.
 * Remplacer 192.168.1.10 par l'IP de la machine qui héberge le backend API.
 */
export const environment: Environment = {
  production: false,
  appName: 'TOTAL FITNESS',
  apiUrl: 'http://192.168.1.10:8000/api/v1',
};
