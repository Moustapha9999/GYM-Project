export interface CoachLight {
  id: string;
  nom: string;
  prenom: string;
  fonction: string;
}

export interface Planning {
  id: string;
  coach_id: string;
  client_id: string | null;
  titre: string;
  date_seance: string;
  heure_debut: string;
  heure_fin: string;
  statut: string;
  created_at?: string;
  coach_nom?: string | null;
  coach_prenom?: string | null;
  client_nom?: string | null;
  client_prenom?: string | null;
}

export interface PlanningCreatePayload {
  coach_id: string;
  client_id?: string | null;
  titre: string;
  date_seance: string;
  heure_debut: string;
  heure_fin: string;
}

export interface PlanningUpdatePayload {
  titre?: string;
  date_seance?: string;
  heure_debut?: string;
  heure_fin?: string;
  statut?: string;
}

export interface PlanningFilters {
  coach_id?: string;
  jour?: string;
  page?: number;
  per_page?: number;
}

export interface Programme {
  id: string;
  client_id: string;
  coach_id: string;
  titre: string;
  objectif: string | null;
  description: string | null;
  date_debut: string;
  date_fin: string | null;
  actif: boolean;
  created_at?: string;
  coach_nom?: string | null;
  coach_prenom?: string | null;
  client_nom?: string | null;
  client_prenom?: string | null;
}

export interface ProgrammeCreatePayload {
  client_id: string;
  coach_id: string;
  titre: string;
  objectif?: string | null;
  description?: string | null;
  date_debut: string;
  date_fin?: string | null;
}

export interface ProgrammeUpdatePayload {
  titre?: string;
  objectif?: string | null;
  description?: string | null;
  date_fin?: string | null;
  actif?: boolean;
}

export interface ProgrammeFilters {
  client_id?: string;
  coach_id?: string;
  actif?: boolean;
  page?: number;
  per_page?: number;
}

export const PLANNING_STATUTS = ['Planifié', 'Confirmé', 'Terminé', 'Annulé'] as const;
