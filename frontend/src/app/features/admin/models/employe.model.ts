export interface Employe {
  id: string;
  nom: string;
  prenom: string;
  fonction: string;
  telephone?: string | null;
  email?: string | null;
  adresse?: string | null;
  date_embauche: string;
  type_contrat?: string | null;
  salaire_base: number;
  statut: string;
  created_at?: string;
}

export interface CreateEmployeRequest {
  nom: string;
  prenom: string;
  fonction: string;
  telephone?: string;
  email?: string;
  adresse?: string;
  date_embauche: string;
  type_contrat?: string;
  salaire_base: number;
}

export interface UpdateEmployeRequest {
  nom?: string;
  prenom?: string;
  fonction?: string;
  telephone?: string;
  email?: string;
  adresse?: string;
  type_contrat?: string;
  salaire_base?: number;
  statut?: string;
}
