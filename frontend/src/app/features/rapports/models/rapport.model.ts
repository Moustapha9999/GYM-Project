export interface RapportFilters {
  date_debut?: string;
  date_fin?: string;
}

export interface FichePaieRapport {
  id: string;
  employe_nom: string;
  fonction?: string | null;
  mois: number;
  annee: number;
  salaire_base: number;
  primes: number;
  bonus: number;
  retenues: number;
  salaire_final?: number | null;
  statut_paiement: string;
  date_paiement?: string | null;
  created_at: string;
}

export interface JournalAuditRapport {
  id: string;
  created_at: string;
  action: string;
  module: string;
  cible_table?: string | null;
  utilisateur_nom?: string | null;
  role_nom?: string | null;
  adresse_ip?: string | null;
}

export interface JournalCaisseRapport {
  id: string;
  date_jour: string;
  total_encaisse: number;
  total_depenses: number;
  solde: number;
  statut: string;
  cloture_par_nom?: string | null;
  cloture_le?: string | null;
}

export interface JournalClientRapport {
  id: string;
  numero_membre: string;
  nom: string;
  prenom: string;
  telephone: string;
  email?: string | null;
  actif: boolean;
  created_at: string;
  derniere_presence?: string | null;
  dernier_abonnement_fin?: string | null;
}
