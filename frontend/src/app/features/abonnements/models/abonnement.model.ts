export interface AbonnementListItem {
  id: string;
  client_id: string;
  client_nom: string;
  type_abonnement: string;
  date_debut: string;
  date_fin: string;
  montant: number;
  statut: string;
  est_inscription: boolean;
  created_at: string;
}

export interface TypeAbonnement {
  id: string;
  nom: string;
  sexe: string | null;
  duree_jours: number;
  montant: number;
  montant_inscription: number;
  description: string | null;
  actif: boolean;
}

export interface AbonnementFilters {
  statut?: string;
  client_id?: string;
  page?: number;
  per_page?: number;
}

export interface SouscriptionPayload {
  client_id: string;
  moyen_paiement_id: string;
}

export interface SouscriptionResult {
  abonnement: {
    id: string;
    date_debut: string;
    date_fin: string;
    montant: number;
    statut: string;
  };
  carte: {
    id: string;
    qr_code_uuid: string;
    date_expiration: string;
    statut: string;
  };
  paiement_reference: string;
  montant_paye: number;
  type_tarif: string;
}

export interface Eligibilite {
  premiere_inscription?: boolean;
  tarif_normal: boolean;
  jours_retard: number;
  delai_grace?: number;
}
