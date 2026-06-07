import { useMemo } from 'react';
import type { ResourceKind } from '@/types/entities';
import type { AppEvent } from '@/types/events';
import { Card } from '@/components/ui/common';
import { useAllEvents } from '@/hooks/useData';
import { sortEvents } from '@/domain/inventory/ordering';
import { stripLocalMeta } from '@/db/repositories/events.repo';
import { relativeFromNow } from '@/lib/time';
import { t } from '@/text';

/** Tipus d'event que pertanyen a cada recurs (per filtrar l'historial de mesures). */
const KIND_EVENT_TYPES: Record<ResourceKind, AppEvent['type'][]> = {
  fuel: ['fuel_measure'],
  water: ['water_measure', 'water_refill'],
  gas: ['gas_measure', 'gas_swap'],
};

/** Descripció curta i llegible d'un event de recurs per a l'historial. */
function describe(ev: AppEvent): string {
  const tankLabel = (tank: string) => t.resources.tank[tank] ?? tank;
  switch (ev.type) {
    case 'fuel_measure':
      if (ev.refillToFull) return t.resources.event.fuelRefillFull;
      if (ev.addedLiters !== undefined) return t.resources.event.fuelRefillLiters(ev.addedLiters);
      return t.resources.event.fuelMeasure(ev.percent ?? 0);
    case 'water_measure':
      return t.resources.event.waterMeasure(ev.counter, tankLabel(ev.activeTank));
    case 'water_refill':
      return ev.toFull
        ? t.resources.event.waterRefillFull(tankLabel(ev.tank))
        : t.resources.event.waterRefillLiters(tankLabel(ev.tank), ev.addedLiters ?? 0);
    case 'gas_measure':
      return t.resources.event.gasMeasure(ev.weightKg);
    case 'gas_swap':
      return t.resources.event.gasSwap;
    case 'resource_config_upsert':
      return t.resources.event.config;
    default:
      return ev.type;
  }
}

/**
 * Historial de mesures d'un recurs concret (separat de l'historial d'estoc). Mostra els
 * events de mesura/ompliment/canvi en ordre descendent (els més nous a dalt). Inclou també
 * els canvis de configuració del recurs per context.
 */
export function ResourceHistory({ kind }: { kind: ResourceKind }) {
  const rawEvents = useAllEvents();

  const rows = useMemo(() => {
    const events: AppEvent[] = (rawEvents ?? []).map((r) => stripLocalMeta(r as never));
    const types = new Set<AppEvent['type']>([
      ...KIND_EVENT_TYPES[kind],
      'resource_config_upsert',
    ]);
    const filtered = sortEvents(events).filter((e) => {
      if (e.type === 'resource_config_upsert') return e.payload.kind === kind;
      return types.has(e.type);
    });
    return filtered.reverse();
  }, [rawEvents, kind]);

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold text-boat-700">{t.resources.historyTitle}</h2>
      {rows.length === 0 ? (
        <Card className="text-sm text-boat-400">{t.resources.historyEmpty}</Card>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((ev) => (
            <li key={ev.id}>
              <Card className="flex items-center justify-between text-sm">
                <span className="font-medium text-boat-900">{describe(ev)}</span>
                <span className="text-xs text-boat-400">
                  {ev.userName} · {relativeFromNow(ev.occurredAt)}
                </span>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
