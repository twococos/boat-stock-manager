import type { ID, ISOTimestamp } from '@/types/entities';
import type { AppEvent, StockDeltaEvent } from '@/types/events';
import { diffDays } from '@/lib/time';

/**
 * Estimador de durada: "dies que durarà X al ritme dels últims N dies".
 *
 * Es basa en el consum (deltes negatius) de l'objecte dins una finestra temporal.
 * Aplicable a qualsevol objecte amb `trackDuration: true` (aigua, gas, cafè…).
 * Veure PLA.md (secció 8.5).
 */

/** Consum total (valor positiu) d'un objecte dins la finestra `[now - windowDays, now]`. */
export function consumptionInWindow(
  objectId: ID,
  events: readonly AppEvent[],
  windowDays: number,
  now: ISOTimestamp,
): number {
  let consumed = 0;
  for (const ev of events) {
    if (ev.type !== 'stock_delta') continue;
    const age = diffDays(ev.occurredAt, now);
    if (age < 0 || age > windowDays) continue;
    for (const line of (ev as StockDeltaEvent).lines) {
      if (line.objectId === objectId && line.delta < 0) consumed += -line.delta;
    }
  }
  return consumed;
}

export interface DurationEstimate {
  /** Consum mitjà per dia en la finestra. 0 si no hi ha consum. */
  ratePerDay: number;
  /** Dies estimats que durarà l'estoc actual. null si no hi ha consum (indefinit). */
  daysRemaining: number | null;
}

/**
 * Estima quants dies durarà `currentStock` al ritme de consum dels últims `windowDays`.
 *
 * @returns `daysRemaining = null` quan no hi ha consum a la finestra (durada indefinida).
 */
export function estimateDuration(
  objectId: ID,
  currentStock: number,
  events: readonly AppEvent[],
  windowDays: number,
  now: ISOTimestamp,
): DurationEstimate {
  const consumed = consumptionInWindow(objectId, events, windowDays, now);
  if (consumed <= 0) return { ratePerDay: 0, daysRemaining: null };
  const ratePerDay = consumed / windowDays;
  return { ratePerDay, daysRemaining: currentStock / ratePerDay };
}
