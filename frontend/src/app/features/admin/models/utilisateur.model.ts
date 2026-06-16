export interface Role {
  id: string;
  nom: string;
  libelle: string;
  systeme?: boolean;
}

export interface Permission {
  id: string;
  code: string;
  module: string;
  action: string;
  libelle?: string | null;
}

export interface RoleDetail extends Role {
  description?: string | null;
  systeme: boolean;
  permissions: Permission[];
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

export interface UpdateUtilisateurRequest {
  nom?: string;
  prenom?: string;
  email?: string;
  password?: string;
  telephone?: string;
  role_nom?: string;
  actif?: boolean;
}
