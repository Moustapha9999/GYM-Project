/**
 * Fallback SMS — stub à brancher sur un vrai provider.
 */
export async function sendSMS(numero, message) {
  const provider = process.env.SMS_PROVIDER;
  if (!provider) {
    return { success: false, erreur: "Provider SMS non configuré" };
  }
  // TODO: implémenter l'appel réel au provider SMS
  return { success: false, erreur: "Provider SMS non implémenté" };
}
