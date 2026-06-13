export interface ChartPoint {
  label: string;
  valeur: number | string;
}

export interface AdminDashboardData {
  revenus_jour: number;
  revenus_mois: number;
  total_abonnements_mois: number;
  total_seances_mois: number;
  total_depenses_mois: number;
  benefice_mois: number;
  clients_actifs: number;
  abonnements_actifs: number;
  abonnements_expirant_7j: number;
  nouvelles_inscriptions_mois: number;
  presences_jour: number;
  revenus_7_derniers_jours: ChartPoint[];
  repartition_abonnements_sexe: ChartPoint[];
}
