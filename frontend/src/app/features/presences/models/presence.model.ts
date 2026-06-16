export interface Presence {
  id: string;
  client_id: string;
  methode: string;
  heure_entree: string;
  heure_sortie: string | null;
  duree_minutes: number | null;
  created_at?: string;
}

export interface PresenceClientInfo extends Presence {
  client_nom: string;
  client_prenom: string;
  numero_membre: string;
}

export interface EntreeManuellePayload {
  client_id: string;
}

export interface EntreeQRPayload {
  qr_code_uuid: string;
}

export interface SortiePayload {
  presence_id?: string;
  qr_code_uuid?: string;
}
