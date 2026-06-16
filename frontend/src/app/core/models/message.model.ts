export type MessageType =
  | 'bienvenue'
  | 'carte_prete'
  | 'renouvellement'
  | 'alerte_fin'
  | 'recu_paiement';

export interface MessageGenere {
  type_message: MessageType;
  libelle: string;
  client_id: string;
  client_nom: string;
  numero_telephone: string | null;
  texte: string;
  lien_whatsapp: string | null;
}
