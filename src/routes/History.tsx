import { useMemo, useState } from 'react';
import { useAuth } from '@/auth/AuthProvider';
import { useAllEvents, useObjectsMap, useRecipes } from '@/hooks/useData';
import { EmptyState, Card } from '@/components/ui/common';
import { ConfirmAction } from '@/components/ui/ConfirmAction';
import { ScrollText, reasonIcon, RotateCcw, History as HistoryIcon, Trash2 } from '@/components/ui/icons';
import { sortEvents, keyOf } from '@/domain/inventory/ordering';
import { activeBarrier } from '@/domain/inventory/barrier';
import { isCutAway } from '@/domain/inventory/derive';
import { stripLocalMeta } from '@/db/repositories/events.repo';
import { commitStockRewind, commitStockReset } from '@/db/commands';
import { relativeFromNow } from '@/lib/time';
import { formatQuantity } from '@/lib/format';
import type { AppEvent, StockDeltaEvent, StockBarrierEvent } from '@/types/events';
import { t } from '@/text';

/** Historial de moviments d'estoc (de franc gràcies a l'event log). PLA.md secció 12.7. */
export function History() {
  const rawEvents = useAllEvents();
  const objectsMap = useObjectsMap();
  const recipes = useRecipes() ?? [];
  const { userName } = useAuth();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Tots els events d'estoc (deltes + barreres) en ordre descendent (els més nous a dalt).
  const { rows, barrier } = useMemo(() => {
    const events: AppEvent[] = (rawEvents ?? []).map((r) => stripLocalMeta(r as never));
    const stock = sortEvents(events).filter(
      (e): e is StockDeltaEvent | StockBarrierEvent =>
        e.type === 'stock_delta' || e.type === 'stock_barrier',
    );
    return { rows: [...stock].reverse(), barrier: activeBarrier(events) };
  }, [rawEvents]);

  const recipeTitle = (id?: string) =>
    id ? recipes.find((r) => r.id === id)?.title : undefined;

  // Deltes que la barrera activa amaga (tallats). Es mostren atenuats dins la fita.
  const rewoundDeltas = useMemo(() => {
    if (!barrier) return [] as StockDeltaEvent[];
    return rows.filter(
      (e): e is StockDeltaEvent =>
        e.type === 'stock_delta' && isCutAway(keyOf(e), barrier),
    );
  }, [rows, barrier]);

  // Es mostren les barreres i els deltes NO tallats per la barrera activa.
  const visibleRows = rows.filter((e) => {
    if (e.type === 'stock_barrier') return true;
    return !(barrier && isCutAway(keyOf(e), barrier));
  });

  if (rows.length === 0) {
    return <EmptyState icon={ScrollText} text={t.history.empty} />;
  }

  async function onRewind(e: StockDeltaEvent) {
    if (!userName) return;
    await commitStockRewind(userName, keyOf(e), e.id);
    setExpandedId(null);
  }

  return (
    <div className="flex flex-col gap-3 pt-2">
      <h1 className="text-xl font-bold">{t.history.title}</h1>
      <ul className="flex flex-col gap-2">
        {visibleRows.map((e) =>
          e.type === 'stock_barrier' ? (
            <li key={e.id}>
              <BarrierCard
                barrier={e}
                isActive={barrier?.id === e.id}
                rewoundDeltas={barrier?.id === e.id ? rewoundDeltas : []}
                objectsMap={objectsMap}
                expanded={expandedId === e.id}
                onToggle={() => setExpandedId(expandedId === e.id ? null : e.id)}
              />
            </li>
          ) : (
            <li key={e.id}>
              <DeltaCard
                delta={e}
                objectsMap={objectsMap}
                recipeTitle={recipeTitle}
                expanded={expandedId === e.id}
                onToggle={() => setExpandedId(expandedId === e.id ? null : e.id)}
                onRewind={() => onRewind(e)}
              />
            </li>
          ),
        )}
      </ul>

      <ConfirmAction
        label={t.history.resetAll}
        message={t.history.resetConfirm}
        confirmLabel={t.history.resetAll}
        icon={Trash2}
        variant="danger"
        onConfirm={() => (userName ? commitStockReset(userName) : undefined)}
      />
    </div>
  );
}

/** Línies d'un delta (objecte + quantitat amb signe). */
function DeltaLines({
  delta,
  objectsMap,
  muted = false,
}: {
  delta: StockDeltaEvent;
  objectsMap: ReturnType<typeof useObjectsMap>;
  muted?: boolean;
}) {
  return (
    <ul className={`mt-2 flex flex-col gap-0.5 text-sm ${muted ? 'opacity-60' : ''}`}>
      {delta.lines.map((l, i) => {
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
  );
}

/** Targeta d'un moviment d'estoc; en clicar es desplega el botó de rebobinar. */
function DeltaCard({
  delta,
  objectsMap,
  recipeTitle,
  expanded,
  onToggle,
  onRewind,
}: {
  delta: StockDeltaEvent;
  objectsMap: ReturnType<typeof useObjectsMap>;
  recipeTitle: (id?: string) => string | undefined;
  expanded: boolean;
  onToggle: () => void;
  onRewind: () => void;
}) {
  const ReasonIcon = reasonIcon(delta.reason);
  return (
    <Card>
      <button type="button" onClick={onToggle} className="w-full text-left">
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-1.5 font-semibold">
            <ReasonIcon size={16} className="text-boat-700" />
            {t.history.reason[delta.reason] ?? delta.reason}
          </span>
          <span className="text-boat-400">{relativeFromNow(delta.occurredAt)}</span>
        </div>
        <div className="mt-1 text-xs text-boat-500">
          {delta.userName}
          {delta.diners ? ` · ${t.history.diners(delta.diners)}` : ''}
          {recipeTitle(delta.recipeId) ? ` · ${recipeTitle(delta.recipeId)}` : ''}
        </div>
        <DeltaLines delta={delta} objectsMap={objectsMap} />
      </button>
      {expanded && (
        <div className="mt-3">
          <ConfirmAction
            label={t.history.rewindHere}
            message={t.history.rewindConfirm}
            confirmLabel={t.history.rewindHere}
            icon={RotateCcw}
            variant="secondary"
            onConfirm={onRewind}
          />
        </div>
      )}
    </Card>
  );
}

/** Fita d'una barrera (rebobinat / estoc reiniciat). La de rewind activa és desplegable. */
function BarrierCard({
  barrier,
  isActive,
  rewoundDeltas,
  objectsMap,
  expanded,
  onToggle,
}: {
  barrier: StockBarrierEvent;
  isActive: boolean;
  rewoundDeltas: StockDeltaEvent[];
  objectsMap: ReturnType<typeof useObjectsMap>;
  expanded: boolean;
  onToggle: () => void;
}) {
  const Icon = barrier.mode === 'reset' ? HistoryIcon : RotateCcw;
  const title =
    barrier.mode === 'reset' ? t.history.resetEntryTitle : t.history.rewindEntryTitle;
  const canExpand = isActive && barrier.mode === 'rewind' && rewoundDeltas.length > 0;

  return (
    <Card className="border-l-4 border-boat-300 bg-boat-50">
      <button
        type="button"
        onClick={canExpand ? onToggle : undefined}
        className={`w-full text-left ${canExpand ? '' : 'cursor-default'}`}
      >
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-1.5 font-semibold text-boat-700">
            <Icon size={16} />
            {title}
          </span>
          <span className="text-boat-400">{relativeFromNow(barrier.occurredAt)}</span>
        </div>
        <div className="mt-1 text-xs text-boat-500">
          {barrier.userName}
          {canExpand ? ` · ${t.history.showRewound(rewoundDeltas.length)}` : ''}
        </div>
      </button>
      {expanded && canExpand && (
        <ul className="mt-2 flex flex-col gap-2">
          {rewoundDeltas.map((d) => (
            <li key={d.id} className="rounded-lg border border-dashed border-boat-200 p-2">
              <div className="flex items-center justify-between text-xs text-boat-400">
                <span>{t.history.cutAway}</span>
                <span>{relativeFromNow(d.occurredAt)}</span>
              </div>
              <DeltaLines delta={d} objectsMap={objectsMap} muted />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
