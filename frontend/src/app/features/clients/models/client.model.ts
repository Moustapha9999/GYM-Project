export interface Client {
  id: string;
  numero_membre: string;
  nom: string;
  prenom: string;
  sexe: string | null;
  date_naissance: string | null;
  telephone: string;
  whatsapp: string | null;
  adresse: string | null;
  email: string | null;
  photo_url: string | null;
  numero_piece_identite: string | null;
  contact_urgence_nom: string | null;
  contact_urgence_telephone: string | null;
  groupe_sanguin: string | null;
  actif: boolean;
  created_at: string;
}

export interface ClientCreatePayload {
  nom: string;
  prenom: string;
  telephone: string;
  sexe?: string;
  date_naissance?: string;
  whatsapp?: string;
  adresse?: string;
  email?: string;
  numero_piece_identite?: string;
  contact_urgence_nom?: string;
  contact_urgence_telephone?: string;
  groupe_sanguin?: string;
}

export interface ClientUpdatePayload {
  nom?: string;
  prenom?: string;
  sexe?: string;
  date_naissance?: string;
  telephone?: string;
  whatsapp?: string;
  adresse?: string;
  email?: string;
  numero_piece_identite?: string;
  contact_urgence_nom?: string;
  contact_urgence_telephone?: string;
  groupe_sanguin?: string;
  actif?: boolean;
}

export interface ClientFilters {
  search?: string;
  sexe?: string;
  actif?: boolean;
  page?: number;
  per_page?: number;
}

export interface ClientImportResult {
  total_lignes: number;
  crees: number;
  echecs: number;
  erreurs: { ligne: number; message: string }[];
}
