export interface ChartPoint {
  label: string;
  valeur: number | string;
}

export interface ReceptionDashboardData {
  revenus_jour: number;
  nombre_paiements_jour: number;
  presences_jour: number;
  presents_actuellement: number;
  seances_jour: number;
  abonnements_souscrits_jour: number;
  abonnements_expirant_7j: number;
  programmes_actifs: number;
  seances_planifiees_jour: number;
  seances_planifiees_semaine: number;
  clients_suivis: number;
  activite_7_jours: ChartPoint[];
  presences_7_jours: ChartPoint[];
  planning_semaine: ChartPoint[];
  planning_par_statut: ChartPoint[];
  programmes_par_statut: ChartPoint[];
}
