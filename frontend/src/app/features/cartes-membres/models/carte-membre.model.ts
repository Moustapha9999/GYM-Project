export interface CarteMembre {
  id: string;
  client_id: string;
  abonnement_id: string | null;
  qr_code_uuid: string;
  date_generation: string;
  date_expiration: string;
  statut: string;
  client_numero: string;
  client_nom: string;
  client_prenom: string;
  client_telephone: string;
  client_whatsapp: string | null;
  client_photo_url: string | null;
  type_abonnement: string | null;
}

export interface CarteMembreFilters {
  statut?: string;
  search?: string;
  page?: number;
  per_page?: number;
}

export interface EnvoiWhatsappResult {
  statut: string;
  numero: string;
  message: string | null;
}
