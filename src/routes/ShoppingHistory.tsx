import { useMemo } from 'react';
import { useAllEvents, useObjectsMap } from '@/hooks/useData';
import { EmptyState, Card } from '@/components/ui/common';
import {
  ScrollText,
  shoppingEventIcon,
  History as HistoryIcon,
} from '@/components/ui/icons';
import { sortEvents, keyOf, compareKey } from '@/domain/inventory/ordering';
import {
  activeShoppingBarrier,
  shoppingListBeforeBarrier,
} from '@/domain/shopping/deriveShoppingList';
import { stripLocalMeta } from '@/db/repositories/events.repo';
import { relativeFromNow } from '@/lib/time';
import { formatQuantity } from '@/lib/format';
import type {
  AppEvent,
  ShoppingAddEvent,
  ShoppingRemoveEvent,
  ShoppingBoughtEvent,
  ShoppingBarrierEvent,
} from '@/types/events';
import { t } from '@/text';

type ShoppingEvent =
  | ShoppingAddEvent
  | ShoppingRemoveEvent
  | ShoppingBoughtEvent
  | ShoppingBarrierEvent;

/**
 * Historial cronològic de la llista de la compra: afegits, comprats, eliminats i "llista
 * buidada" (aquesta amb els objectes que hi havia com a subpunts, com els elements rebobinats
 * de l'estoc). Mirall de FaultsHistory.
 */
export function ShoppingHistory() {
  const rawEvents = useAllEvents();
  const objectsMap = useObjectsMap();

  const { rows, allEvents } = useMemo(() => {
    const events: AppEvent[] = (rawEvents ?? []).map((r) => stripLocalMeta(r as never));
    const sorted = sortEvents(events);
    const barrier = activeShoppingBarrier(sorted);
    const shopping = sorted.filter((e): e is ShoppingEvent => {
      if (
        e.type !== 'shopping_add' &&
        e.type !== 'shopping_remove' &&
        e.type !== 'shopping_bought' &&
        e.type !== 'shopping_barrier'
      ) {
        return false;
      }
      // La barrera sempre es mostra; la resta, només si no està tallada.
      if (e.type === 'shopping_barrier') return true;
      return !(barrier && compareKey(keyOf(e), barrier.cut) < 0);
    });
    return { rows: [...shopping].reverse(), allEvents: events };
  }, [rawEvents]);

  if (rows.length === 0) {
    return <EmptyState icon={ScrollText} text={t.shopping.historyEmpty} />;
  }

  return (
    <div className="flex flex-col gap-3 pt-2">
      <h1 className="text-xl font-bold">{t.shopping.historyTitle}</h1>

      <ul className="flex flex-col gap-2">
        {rows.map((e) =>
          e.type === 'shopping_barrier' ? (
            <li key={e.id}>
              <ClearedCard barrier={e} allEvents={allEvents} objectsMap={objectsMap} />
            </li>
          ) : (
            <li key={e.id}>
              <ShoppingEventCard event={e} objectsMap={objectsMap} />
            </li>
          ),
        )}
      </ul>
    </div>
  );
}

/** Una fila de l'historial: tipus d'event + objecte + quantitat + autor + data. */
function ShoppingEventCard({
  event,
  objectsMap,
}: {
  event: ShoppingAddEvent | ShoppingRemoveEvent | ShoppingBoughtEvent;
  objectsMap: ReturnType<typeof useObjectsMap>;
}) {
  const kind =
    event.type === 'shopping_add'
      ? 'add'
      : event.type === 'shopping_bought'
        ? 'bought'
        : 'remove';
  const Icon = shoppingEventIcon(kind);
  const object = objectsMap.get(event.objectId);
  const name = object?.name ?? event.objectId;
  // Quantitat mostrada: add (amb signe) i bought (qty); remove no en porta.
  const qty =
    event.type === 'shopping_add'
      ? event.delta
      : event.type === 'shopping_bought'
        ? event.qty
        : null;

  return (
    <Card>
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 font-semibold text-boat-700">
          <Icon size={16} />
          {t.shopping.eventKind[kind]}
        </span>
        <span className="text-boat-400">{relativeFromNow(event.occurredAt)}</span>
      </div>
      <div className="mt-0.5 flex items-center justify-between">
        <span className="truncate">{name}</span>
        {qty !== null && (
          <span className="tabular-nums text-boat-600">
            {event.type === 'shopping_add' && qty > 0 ? '+' : ''}
            {formatQuantity(qty, object?.quantityType ?? 'units')}
          </span>
        )}
      </div>
      <div className="mt-1 text-xs text-boat-400">{event.userName}</div>
    </Card>
  );
}

/** Fita de "Llista buidada": mostra com a subpunts els objectes que hi havia abans del tall. */
function ClearedCard({
  barrier,
  allEvents,
  objectsMap,
}: {
  barrier: ShoppingBarrierEvent;
  allEvents: AppEvent[];
  objectsMap: ReturnType<typeof useObjectsMap>;
}) {
  const cleared = useMemo(
    () => [...shoppingListBeforeBarrier(allEvents, barrier).values()],
    [allEvents, barrier],
  );

  return (
    <Card className="border-l-4 border-boat-300 bg-boat-50">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 font-semibold text-boat-700">
          <HistoryIcon size={16} />
          {t.shopping.clearedEntryTitle}
        </span>
        <span className="text-boat-400">{relativeFromNow(barrier.occurredAt)}</span>
      </div>
      <div className="mt-1 text-xs text-boat-500">
        {barrier.userName}
        {cleared.length > 0 ? ` · ${t.shopping.showCleared(cleared.length)}` : ''}
      </div>
      {cleared.length > 0 && (
        <ul className="mt-2 flex flex-col gap-1">
          {cleared.map((c) => {
            const object = objectsMap.get(c.objectId);
            return (
              <li
                key={c.objectId}
                className="flex justify-between rounded-lg border border-dashed border-boat-200 p-2 text-sm opacity-70"
              >
                <span>{object?.name ?? c.objectId}</span>
                <span className="tabular-nums">
                  {formatQuantity(c.quantity, object?.quantityType ?? 'units')}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
