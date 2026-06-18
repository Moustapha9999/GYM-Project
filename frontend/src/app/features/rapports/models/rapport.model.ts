export interface RapportFilters {
  date_debut?: string;
  date_fin?: string;
  mois?: string;
  annee?: string;
  statut?: string;
  employe_id?: string;
  categorie_id?: string;
  type_paiement?: string;
}

export interface MasseSalarialeRapport {
  mois: number;
  annee: number;
  nombre_fiches: number;
  total_brut: number;
  total_net: number;
}

export interface GenererFichePaieRequest {
  employe_id: string;
  mois: number;
  annee: number;
  primes: number;
  bonus: number;
  retenues: number;
}

export interface JournalDepenseRapport {
  id: string;
  reference: string;
  libelle: string;
  categorie_id: string;
  categorie_nom: string;
  montant: number;
  date_depense: string;
  justificatif_url?: string | null;
  created_at: string;
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
  reference: string;
  date_paiement: string;
  type_paiement: string;
  client_nom?: string | null;
  montant: number;
  moyen_paiement: string;
  statut: string;
  encaisse_par_nom: string;
  role_encaisseur: string;
  abonnement_id?: string | null;
  abonnement_date_debut?: string | null;
  abonnement_date_fin?: string | null;
  abonnement_statut?: string | null;
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
