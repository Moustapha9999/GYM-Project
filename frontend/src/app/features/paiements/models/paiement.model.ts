export interface PaiementDetail {
  id: string;
  reference: string;
  client_nom: string | null;
  type_paiement: string;
  montant: number;
  moyen_paiement: string;
  statut: string;
  date_paiement: string;
}

export interface PaiementRead {
  id: string;
  reference: string;
  client_id: string | null;
  abonnement_id: string | null;
  seance_journaliere_id: string | null;
  type_paiement: string;
  montant: number;
  moyen_paiement_id: string;
  statut: string;
  date_paiement: string;
  created_at: string;
}

export interface RepartitionMoyen {
  moyen_paiement: string;
  nombre: number;
  total: number;
}

export interface CaisseJour {
  jour: string;
  total_encaisse: number;
  nombre_paiements: number;
  repartition: RepartitionMoyen[];
  total_abonnements: number;
  total_seances: number;
}

export interface MoyenPaiement {
  id: string;
  code: string;
  libelle: string;
  actif: boolean;
}

export interface PaiementFilters {
  date_debut?: string;
  date_fin?: string;
  moyen_paiement_id?: string;
  type_paiement?: string;
}

export interface PaiementCreatePayload {
  type_paiement: string;
  moyen_paiement_id: string;
  client_id?: string;
  nom_client_occasionnel?: string;
  montant?: number;
}

export interface PaiementCreateResult {
  paiement_reference: string;
  montant: number;
  type_paiement: string;
}
