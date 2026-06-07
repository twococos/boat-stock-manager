import type { ID, InventoryEntry, ItemObject, ExpiryLot } from '@/types/entities';
import type { AppEvent, StockDeltaEvent, StockBarrierEvent, OrderKey } from '@/types/events';
import { sortEvents, compareKey, keyOf } from './ordering';
import { activeBarrier } from './barrier';
import { applyLotDelta, lotsTotal } from './lots';

/**
 * Deriva l'inventari complet reproduint el log d'esdeveniments.
 *
 * ═══ LA REGLA D'OR (no negociable) ═══
 * L'estoc MAI és negatiu. La saturació a 0 s'aplica A CADA PAS, en ordre cronològic
 * (un fold), NO sumant tots els deltes i saturant al final.
 *
 *   Esdeveniments: +2, −3, −1, +1
 *   ✗ SUM-i-saturar:  sum=-1 → max(0,-1)=0      (perd la compra final!)
 *   ✓ Fold per pas:   2 → 0 → 0 → 1
 *
 * El consum "impossible" es perd en el moment exacte i no arrossega deute negatiu cap
 * al futur. Veure PLA.md (seccions 3.1 i 8.2).
 *
 * Els lots de caducitat (FIFO) es mantenen en paral·lel a la quantitat. Per a objectes
 * amb caducitat la quantitat es deriva de la suma de lots; per a la resta s'usa un
 * acumulador simple saturat a 0.
 *
 * @param events Tots els esdeveniments coneguts (locals + sincronitzats).
 * @param objectsById Mapa de definicions d'objecte (per a la política de caducitat).
 *   Pot estar buit o incomplet: en aquest cas l'objecte es tracta sense caducitat.
 */
/**
 * Decideix si un stock_delta (per la seva clau d'ordre) queda IGNORAT per una barrera.
 *
 * - rewind: s'ignoren els deltes ESTRICTAMENT posteriors al tall (`> cut`). L'event diana
 *   (clau == cut) i els anteriors es conserven → "torna a l'estat just després d'aquí".
 * - reset: s'ignora tot el passat (`< cut`, on cut és la clau del propi event reset). Com
 *   cap delta comparteix la clau del reset, només sobreviuen els deltes posteriors al reset.
 */
export function isCutAway(deltaKey: OrderKey, barrier: StockBarrierEvent): boolean {
  const cmp = compareKey(deltaKey, barrier.cut);
  return barrier.mode === 'rewind' ? cmp > 0 : cmp < 0;
}

export function deriveInventory(
  events: readonly AppEvent[],
  objectsById: ReadonlyMap<ID, ItemObject> = new Map(),
): Map<ID, InventoryEntry> {
  const sorted = sortEvents(events);

  // Barrera de tall activa (l'última per ordre determinista). Determina quins stock_delta
  // s'ignoren: rewind conserva l'event diana, reset ignora tot el passat. Veure barrier.ts.
  const barrier = activeBarrier(sorted);

  // Acumuladors per objecte.
  const quantity = new Map<ID, number>();
  const lots = new Map<ID, ExpiryLot[]>();
  const hasExpiry = new Map<ID, boolean>();

  for (const ev of sorted) {
    if (ev.type !== 'stock_delta') continue;
    if (barrier && isCutAway(keyOf(ev), barrier)) continue;
    const delta = ev as StockDeltaEvent;

    for (let i = 0; i < delta.lines.length; i++) {
      const line = delta.lines[i]!;
      const obj = objectsById.get(line.objectId);
      const objHasExpiry = !!obj?.expiry && obj.expiry.mode !== 'never';

      // Recordem si algun cop l'objecte ha tingut caducitat (per decidir la font de
      // veritat de la quantitat).
      if (objHasExpiry) hasExpiry.set(line.objectId, true);

      if (objHasExpiry || line.expiresAt) {
        // Camí amb lots: la quantitat la dicta la suma de lots.
        const prevLots = lots.get(line.objectId) ?? [];
        // lotId determinista i únic per (esdeveniment, línia) → recompute estable.
        const lotId = `${ev.id}:${i}`;
        const nextLots = applyLotDelta(prevLots, obj, line, lotId, ev.occurredAt);
        lots.set(line.objectId, nextLots);
        quantity.set(line.objectId, lotsTotal(nextLots));
        hasExpiry.set(line.objectId, true);
      } else {
        // Camí simple: acumulador saturat a 0 a cada pas.
        const prev = quantity.get(line.objectId) ?? 0;
        quantity.set(line.objectId, Math.max(0, prev + line.delta));
      }
    }
  }

  const result = new Map<ID, InventoryEntry>();
  for (const [objectId, qty] of quantity) {
    const entry: InventoryEntry = { objectId, quantity: qty };
    if (hasExpiry.get(objectId)) {
      const objLots = lots.get(objectId) ?? [];
      entry.lots = objLots;
      entry.quantity = lotsTotal(objLots);
    }
    result.set(objectId, entry);
  }
  return result;
}

/** Conveniència: quantitat actual d'un objecte concret a partir del log. */
export function deriveQuantity(
  objectId: ID,
  events: readonly AppEvent[],
  objectsById?: ReadonlyMap<ID, ItemObject>,
): number {
  return deriveInventory(events, objectsById).get(objectId)?.quantity ?? 0;
}
