import type { ID, ISOTimestamp, ItemObject } from '@/types/entities';
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

export interface WaterEstimate extends DurationEstimate {
  /** Litres totals d'aigua potable en estoc (Σ ampolles × capacitat). */
  litersInStock: number;
}

/**
 * Estima la durada de l'AIGUA POTABLE de forma AGREGADA, en litres.
 *
 * Tots els objectes d'aigua (foodCategory === 'water') es tracten com un sol recurs:
 * no importa si queden ampolles de 5 L o de 8 L, només els litres totals i quants se'n
 * gasten al dia. Litres en estoc = Σ(ampolles × capacitat). Consum a la finestra =
 * Σ(ampolles gastades × capacitat de cada objecte). Els objectes sense `capacityLiters`
 * s'ignoren en el càlcul de litres.
 *
 * @param waterObjects Definicions dels objectes d'aigua.
 * @param stockByObject Mapa objectId → ampolles en estoc (de l'inventari derivat).
 */
export function estimateWaterDuration(
  waterObjects: readonly ItemObject[],
  stockByObject: ReadonlyMap<ID, number>,
  events: readonly AppEvent[],
  windowDays: number,
  now: ISOTimestamp,
): WaterEstimate {
  const capacityById = new Map<ID, number>();
  let litersInStock = 0;
  for (const obj of waterObjects) {
    const cap = obj.capacityLiters ?? 0;
    capacityById.set(obj.id, cap);
    litersInStock += (stockByObject.get(obj.id) ?? 0) * cap;
  }

  let litersConsumed = 0;
  for (const ev of events) {
    if (ev.type !== 'stock_delta') continue;
    const age = diffDays(ev.occurredAt, now);
    if (age < 0 || age > windowDays) continue;
    for (const line of (ev as StockDeltaEvent).lines) {
      const cap = capacityById.get(line.objectId);
      if (cap === undefined || line.delta >= 0) continue;
      litersConsumed += -line.delta * cap;
    }
  }

  if (litersConsumed <= 0) {
    return { ratePerDay: 0, daysRemaining: null, litersInStock };
  }
  const ratePerDay = litersConsumed / windowDays;
  return { ratePerDay, daysRemaining: litersInStock / ratePerDay, litersInStock };
}
