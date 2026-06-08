import type { ID, ISOTimestamp, UserName } from '@/types/entities';
import type { AppEvent, ShoppingBarrierEvent } from '@/types/events';
import { sortEvents, keyOf, compareKey } from '@/domain/inventory/ordering';

/**
 * Derivació de la llista de la compra a partir del log d'esdeveniments.
 *
 * Un ítem de la llista no es guarda; es deriva agregant els seus events
 * (`shopping_add` amb signe, `shopping_remove`, `shopping_bought`) en ordre determinista
 * `(occurredAt, deviceId, seq)`. La quantitat per objecte = suma de deltes, saturada a 0;
 * els objectes amb quantitat ≤ 0 surten de la llista. Paral·lel a `deriveFaults`. Tots els
 * dispositius deriven el mateix → sense conflictes de sync.
 *
 * Una `shopping_barrier` (buidar la llista) fa que s'ignorin tots els events shopping_* amb
 * clau d'ordre < cut (anàleg al reset d'avaries). Veure CONTEXT.md (barrera de tall).
 */

/** Estat derivat d'un ítem de la llista de la compra (agregat per objectId). */
export interface DerivedShoppingItem {
  objectId: ID; // = clau primària a Dexie
  quantity: number; // suma de deltes, saturada >= 0
  addedAt: ISOTimestamp; // primer cop que es va afegir (o re-afegit després de quedar a 0)
  addedBy: UserName;
}

/** True si l'event és un dels que la barrera de buidat pot tallar (no la barrera mateixa). */
function isShoppingItemEvent(ev: AppEvent): boolean {
  return (
    ev.type === 'shopping_add' ||
    ev.type === 'shopping_remove' ||
    ev.type === 'shopping_bought'
  );
}

/** Última `shopping_barrier` per ordre determinista (la que val), o null. */
export function activeShoppingBarrier(
  events: readonly AppEvent[],
): ShoppingBarrierEvent | null {
  let found: ShoppingBarrierEvent | null = null;
  for (const ev of sortEvents(events)) {
    if (ev.type === 'shopping_barrier') found = ev;
  }
  return found;
}

/** Agrega els events shopping_* (ja ordenats) en un mapa objectId → ítem; saturat a 0. */
function foldShopping(sorted: readonly AppEvent[]): Map<ID, DerivedShoppingItem> {
  const items = new Map<ID, DerivedShoppingItem>();
  for (const ev of sorted) {
    if (ev.type === 'shopping_add') {
      const cur = items.get(ev.objectId);
      if (cur) {
        cur.quantity = Math.max(0, cur.quantity + ev.delta);
      } else {
        items.set(ev.objectId, {
          objectId: ev.objectId,
          quantity: Math.max(0, ev.delta),
          addedAt: ev.occurredAt,
          addedBy: ev.userName,
        });
      }
    } else if (ev.type === 'shopping_remove' || ev.type === 'shopping_bought') {
      items.delete(ev.objectId);
    }
  }
  // Un add que va deixar el total a 0 (o menys) treu l'objecte de la llista.
  for (const [id, it] of items) if (it.quantity <= 0) items.delete(id);
  return items;
}

/**
 * Deriva el mapa `objectId → DerivedShoppingItem` a partir del log. Els events shopping_*
 * anteriors a la barrera de buidat activa s'ignoren.
 */
export function deriveShoppingList(
  events: readonly AppEvent[],
): Map<ID, DerivedShoppingItem> {
  const sorted = sortEvents(events);
  const barrier = activeShoppingBarrier(sorted);
  const live = sorted.filter(
    (ev) => !(barrier && isShoppingItemEvent(ev) && compareKey(keyOf(ev), barrier.cut) < 0),
  );
  return foldShopping(live);
}

/**
 * Estat de la llista just ABANS d'una barrera donada (els objectes que es van buidar).
 * Pur i determinista; l'historial el fa servir per mostrar els subpunts de "Llista buidada".
 */
export function shoppingListBeforeBarrier(
  events: readonly AppEvent[],
  barrier: ShoppingBarrierEvent,
): Map<ID, DerivedShoppingItem> {
  const sorted = sortEvents(events);
  const before = sorted.filter(
    (ev) => isShoppingItemEvent(ev) && compareKey(keyOf(ev), barrier.cut) < 0,
  );
  return foldShopping(before);
}

/** Ítems actuals de la llista, ordenats per data d'afegit (els més recents a dalt). */
export function shoppingItems(
  list: ReadonlyMap<ID, DerivedShoppingItem>,
): DerivedShoppingItem[] {
  return [...list.values()].sort((a, b) =>
    a.addedAt < b.addedAt ? 1 : a.addedAt > b.addedAt ? -1 : 0,
  );
}
