export interface TarifAbonnement {
  id: string;
  nom: string;
  sexe: string;
  duree_jours: number;
  montant: number;
  montant_inscription: number;
}

export interface Tarifs {
  tarif_seance_journaliere: number;
  abonnement_homme: TarifAbonnement;
  abonnement_femme: TarifAbonnement;
}

export interface TarifAbonnementUpdate {
  montant: number;
  montant_inscription: number;
}

export interface TarifsUpdate {
  tarif_seance_journaliere: number;
  abonnement_homme: TarifAbonnementUpdate;
  abonnement_femme: TarifAbonnementUpdate;
}
