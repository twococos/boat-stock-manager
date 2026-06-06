import type { ExpiryLot, ID, ISOTimestamp, ItemObject } from '@/types/entities';
import type { StockDeltaLine } from '@/types/events';
import { addDaysISO } from '@/lib/time';

/**
 * Gestió de lots de caducitat (FIFO).
 *
 * Un mateix objecte pot tenir unitats comprades en dies diferents amb caducitats
 * diferents (p.ex. iogurts). Cada delta positiu de menjar amb caducitat crea un lot;
 * cada delta negatiu consumeix FIFO (primer el que caduca abans / més antic). La suma
 * de lots ha de quadrar sempre amb la quantitat total de l'objecte.
 *
 * Veure PLA.md (secció 8.3).
 */

/**
 * Calcula la data de caducitat d'un lot nou segons la política de l'objecte.
 * - `never` o objecte sense política / no-menjar → undefined (sense caducitat).
 * - `days_from_purchase` → addedAt + N dies.
 * - `define_on_add` → la data ha de venir a `line.expiresAt` (escrita en comprar).
 */
export function computeExpiresAt(
  object: ItemObject | undefined,
  line: StockDeltaLine,
  addedAt: ISOTimestamp,
): ISOTimestamp | undefined {
  const policy = object?.expiry;
  if (!policy || policy.mode === 'never') return undefined;
  if (policy.mode === 'days_from_purchase') return addDaysISO(addedAt, policy.days);
  // define_on_add: la data ve amb la línia (pot ser undefined si l'usuari no l'ha posat)
  return line.expiresAt;
}

/** Ordena lots per consum FIFO: primer el que caduca abans; sense data, al final. */
function fifoCompare(a: ExpiryLot, b: ExpiryLot): number {
  // Lots amb caducitat es consumeixen abans que els que no en tenen.
  if (a.expiresAt && b.expiresAt) {
    if (a.expiresAt !== b.expiresAt) return a.expiresAt < b.expiresAt ? -1 : 1;
  } else if (a.expiresAt && !b.expiresAt) {
    return -1;
  } else if (!a.expiresAt && b.expiresAt) {
    return 1;
  }
  // Desempat estable per ordre d'addició (més antic primer).
  if (a.addedAt !== b.addedAt) return a.addedAt < b.addedAt ? -1 : 1;
  return a.lotId < b.lotId ? -1 : a.lotId > b.lotId ? 1 : 0;
}

/**
 * Aplica un delta de lots a la llista existent d'un objecte.
 *
 * - Delta positiu: afegeix un lot nou (si l'objecte té caducitat) o engreixa el
 *   "lot sense caducitat" implícit (representat com a lot amb `expiresAt` undefined).
 * - Delta negatiu: consumeix FIFO, descartant lots buits; satura a 0 (mai negatiu).
 *
 * @param lots Lots actuals (no es muta; es retorna una nova llista).
 * @param object Definició de l'objecte (per a la política de caducitat). Pot faltar.
 * @param line Línia de delta amb `objectId`, `delta` i opcionalment `expiresAt`.
 * @param lotId Identificador per al lot nou (en cas de delta positiu).
 * @param addedAt Marca de temps d'addició (normalment l'`occurredAt` de l'esdeveniment).
 */
export function applyLotDelta(
  lots: readonly ExpiryLot[],
  object: ItemObject | undefined,
  line: StockDeltaLine,
  lotId: ID,
  addedAt: ISOTimestamp,
): ExpiryLot[] {
  const next = lots.map((l) => ({ ...l }));

  if (line.delta > 0) {
    const expiresAt = computeExpiresAt(object, line, addedAt);
    next.push({ lotId, addedAt, expiresAt, quantity: line.delta });
    return next;
  }

  if (line.delta < 0) {
    let toConsume = -line.delta;
    next.sort(fifoCompare);
    for (const lot of next) {
      if (toConsume <= 0) break;
      const take = Math.min(lot.quantity, toConsume);
      lot.quantity -= take;
      toConsume -= take;
    }
    // Si toConsume > 0, no hi havia prou estoc: simplement no es consumeix més
    // (l'estoc queda a 0; mai negatiu — coherent amb la regla d'or).
    return next.filter((l) => l.quantity > 0);
  }

  return next;
}

/** Suma total de les quantitats de tots els lots. */
export function lotsTotal(lots: readonly ExpiryLot[]): number {
  return lots.reduce((sum, l) => sum + l.quantity, 0);
}
