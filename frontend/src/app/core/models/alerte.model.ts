export type AlerteSeverity = 'info' | 'warning' | 'danger';

export type AlerteType =
  | 'abonnement_expiration'
  | 'abonnement_expire'
  | 'nouveau_client'
  | 'nouvel_abonnement'
  | 'nouveau_paiement';

export interface AlerteItem {
  id: string;
  type: AlerteType;
  severity: AlerteSeverity;
  titre: string;
  message: string;
  route: string | null;
  entity_id: string | null;
  created_at: string;
}

export interface AlertesDashboard {
  total: number;
  items: AlerteItem[];
}
