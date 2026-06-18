export interface EmployeCompteUtilisateur {
  id: string;
  email: string;
  actif: boolean;
  role_nom: string;
  role_libelle: string;
}

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
  utilisateur_id?: string | null;
  role_associe?: string | null;
  compte_utilisateur?: EmployeCompteUtilisateur | null;
}

export const FONCTIONS_AVEC_ROLE = [
  'Réceptionniste',
  'Coach',
  'Manager',
  'Responsable de salle',
  'Responsable RH',
  'Comptable',
  'Directeur adjoint',
] as const;

export function fonctionAvecRole(fonction: string): boolean {
  return (FONCTIONS_AVEC_ROLE as readonly string[]).includes(fonction);
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
