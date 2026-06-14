export interface Role {
  id: string;
  nom: string;
  libelle: string;
}

export interface Utilisateur {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string | null;
  actif: boolean;
  role: {
    nom: string;
    libelle: string;
  };
  created_at?: string;
}

export interface CreateUtilisateurRequest {
  nom: string;
  prenom: string;
  email: string;
  password: string;
  telephone?: string;
  role_nom: string;
}
