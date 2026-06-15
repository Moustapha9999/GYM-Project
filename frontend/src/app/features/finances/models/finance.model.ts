export interface CategorieDepense {
  id: string;
  nom: string;
}

export interface Depense {
  id: string;
  reference: string;
  categorie_id: string;
  libelle: string;
  montant: number;
  date_depense: string;
  justificatif_url: string | null;
  created_at: string;
}

export interface DepenseCreatePayload {
  categorie_id: string;
  libelle: string;
  montant: number;
  date_depense?: string;
  justificatif_url?: string;
}

export interface DepenseUpdatePayload {
  categorie_id?: string;
  libelle?: string;
  montant?: number;
  date_depense?: string;
  justificatif_url?: string;
}

export interface DepenseFilters {
  date_debut?: string;
  date_fin?: string;
  categorie_id?: string;
  page?: number;
  per_page?: number;
}

export interface DepenseParCategorie {
  categorie: string;
  total: number;
}

export interface BilanFinancier {
  date_debut: string;
  date_fin: string;
  total_revenus: number;
  total_depenses: number;
  benefice: number;
  depenses_par_categorie: DepenseParCategorie[];
}
