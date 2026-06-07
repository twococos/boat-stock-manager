import { useMemo } from 'react';
import { useAllEvents, useObjectsMap, useRecipes } from '@/hooks/useData';
import { EmptyState, Card } from '@/components/ui/common';
import { ScrollText, reasonIcon } from '@/components/ui/icons';
import { sortEvents } from '@/domain/inventory/ordering';
import { stripLocalMeta } from '@/db/repositories/events.repo';
import { relativeFromNow } from '@/lib/time';
import { formatQuantity } from '@/lib/format';
import type { AppEvent, StockDeltaEvent } from '@/types/events';
import { t } from '@/text';

/** Historial de moviments d'estoc (de franc gràcies a l'event log). PLA.md secció 12.7. */
export function History() {
  const rawEvents = useAllEvents();
  const objectsMap = useObjectsMap();
  const recipes = useRecipes() ?? [];

  const stockEvents = useMemo(() => {
    const events: AppEvent[] = (rawEvents ?? []).map((r) => stripLocalMeta(r as never));
    return sortEvents(events)
      .reverse()
      .filter((e): e is StockDeltaEvent => e.type === 'stock_delta');
  }, [rawEvents]);

  const recipeTitle = (id?: string) =>
    id ? recipes.find((r) => r.id === id)?.title : undefined;

  if (stockEvents.length === 0) {
    return <EmptyState icon={ScrollText} text={t.history.empty} />;
  }

  return (
    <div className="flex flex-col gap-3 pt-2">
      <h1 className="text-xl font-bold">{t.history.title}</h1>
      <ul className="flex flex-col gap-2">
        {stockEvents.map((e) => {
          const ReasonIcon = reasonIcon(e.reason);
          return (
          <li key={e.id}>
            <Card>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 font-semibold">
                  <ReasonIcon size={16} className="text-boat-700" />
                  {t.history.reason[e.reason] ?? e.reason}
                </span>
                <span className="text-boat-400">{relativeFromNow(e.occurredAt)}</span>
              </div>
              <div className="mt-1 text-xs text-boat-500">
                {e.userName}
                {e.diners ? ` · ${t.history.diners(e.diners)}` : ''}
                {recipeTitle(e.recipeId) ? ` · ${recipeTitle(e.recipeId)}` : ''}
              </div>
              <ul className="mt-2 flex flex-col gap-0.5 text-sm">
                {e.lines.map((l, i) => {
                  const obj = objectsMap.get(l.objectId);
                  return (
                    <li key={i} className="flex justify-between">
                      <span>{obj?.name ?? l.objectId}</span>
                      <span className={l.delta < 0 ? 'text-red-600' : 'text-green-700'}>
                        {l.delta > 0 ? '+' : ''}
                        {formatQuantity(l.delta, obj?.quantityType ?? 'units')}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </Card>
          </li>
          );
        })}
      </ul>
    </div>
  );
}
