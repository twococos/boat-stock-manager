import { newId } from './id';

const DEVICE_ID_KEY = 'boat-stock-manager.deviceId';

/**
 * Retorna un identificador estable per a aquesta instal·lació (dispositiu/navegador).
 *
 * Es genera un cop i es persisteix a localStorage. Serveix com a desempat determinista
 * en l'ordenació d'esdeveniments (clau `(occurredAt, deviceId, seq)`) i per a la
 * comptabilitat de clock skew entre dispositius.
 */
export function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = newId();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}
