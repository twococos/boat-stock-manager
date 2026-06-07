import type { AppEvent, OrderKey } from '@/types/events';

/** Extreu la clau d'ordre `(occurredAt, deviceId, seq)` d'un esdeveniment. */
export function keyOf(ev: { occurredAt: string; deviceId: string; seq: number }): OrderKey {
  return { occurredAt: ev.occurredAt, deviceId: ev.deviceId, seq: ev.seq };
}

/**
 * Comparador determinista de claus d'ordre `(occurredAt, deviceId, seq)`.
 * - `occurredAt`: rellotge del dispositiu quan va passar l'acció (cronologia volguda).
 * - `deviceId`: desempat estable entre dispositius.
 * - `seq`: comptador monòton per dispositiu (manté l'ordre relatiu dels propis
 *   esdeveniments d'un dispositiu fins i tot amb desviació de rellotge).
 *
 * És CRÍTIC que aquest ordre sigui idèntic a tots els dispositius perquè tots derivin
 * exactament el mateix inventari. Les barreres de tall (rewind/reset) comparen claus amb
 * aquesta mateixa funció, així que la lògica ha de ser ÚNICA aquí. Veure PLA.md (3.2).
 */
export function compareKey(a: OrderKey, b: OrderKey): number {
  if (a.occurredAt !== b.occurredAt) return a.occurredAt < b.occurredAt ? -1 : 1;
  if (a.deviceId !== b.deviceId) return a.deviceId < b.deviceId ? -1 : 1;
  return a.seq - b.seq;
}

/** Comparador d'esdeveniments per a l'ordenació cronològica del fold. */
export function compareEvents(a: AppEvent, b: AppEvent): number {
  return compareKey(keyOf(a), keyOf(b));
}

/** Retorna una còpia ordenada dels esdeveniments segons {@link compareEvents}. */
export function sortEvents(events: readonly AppEvent[]): AppEvent[] {
  return [...events].sort(compareEvents);
}
