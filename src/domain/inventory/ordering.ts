import type { AppEvent } from '@/types/events';

/**
 * Comparador determinista d'esdeveniments per a l'ordenació cronològica del fold.
 *
 * Clau d'ordre: `(occurredAt, deviceId, seq)`.
 * - `occurredAt`: rellotge del dispositiu quan va passar l'acció (cronologia volguda).
 * - `deviceId`: desempat estable entre dispositius.
 * - `seq`: comptador monòton per dispositiu (manté l'ordre relatiu dels propis
 *   esdeveniments d'un dispositiu fins i tot amb desviació de rellotge).
 *
 * És CRÍTIC que aquest ordre sigui idèntic a tots els dispositius perquè tots derivin
 * exactament el mateix inventari. Veure PLA.md (secció 3.2).
 */
export function compareEvents(a: AppEvent, b: AppEvent): number {
  if (a.occurredAt !== b.occurredAt) return a.occurredAt < b.occurredAt ? -1 : 1;
  if (a.deviceId !== b.deviceId) return a.deviceId < b.deviceId ? -1 : 1;
  return a.seq - b.seq;
}

/** Retorna una còpia ordenada dels esdeveniments segons {@link compareEvents}. */
export function sortEvents(events: readonly AppEvent[]): AppEvent[] {
  return [...events].sort(compareEvents);
}
