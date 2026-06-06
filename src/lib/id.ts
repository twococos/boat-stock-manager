import { v7 as uuidv7 } from 'uuid';

/**
 * Genera un identificador únic UUID v7.
 *
 * UUID v7 incorpora una marca de temps als bits més significatius, de manera que
 * els ids són ordenables cronològicament. Això ens dóna una seguretat secundària
 * per a l'ordenació d'esdeveniments (a banda de `occurredAt`/`seq`) i és la clau de
 * dedup del log d'esdeveniments.
 */
export function newId(): string {
  return uuidv7();
}
