import { useMemo, useState } from 'react';
import { useAuth } from '@/auth/AuthProvider';
import { useAllEvents } from '@/hooks/useData';
import { EmptyState, Card } from '@/components/ui/common';
import { ConfirmAction } from '@/components/ui/ConfirmAction';
import { ScrollText, faultEventIcon, History as HistoryIcon, Trash2 } from '@/components/ui/icons';
import { sortEvents, keyOf, compareKey } from '@/domain/inventory/ordering';
import {
  deriveFaults,
  activeFaultBarrier,
  SEVERITY_BAND,
  type DerivedFault,
} from '@/domain/faults/deriveFaults';
import { stripLocalMeta } from '@/db/repositories/events.repo';
import { commitFaultReset } from '@/db/commands';
import { relativeFromNow } from '@/lib/time';
import type {
  AppEvent,
  FaultReportEvent,
  FaultUpdateEvent,
  FaultResolveEvent,
  FaultBarrierEvent,
} from '@/types/events';
import { t } from '@/text';

type FaultEvent =
  | FaultReportEvent
  | FaultUpdateEvent
  | FaultResolveEvent
  | FaultBarrierEvent;

/** Historial cronològic de tots els events d'avaria (report / update / resolve / reset). */
export function FaultsHistory() {
  const rawEvents = useAllEvents();
  const { userName } = useAuth();
  const [filterFaultId, setFilterFaultId] = useState<string | null>(null);

  const { rows, faultsMap } = useMemo(() => {
    const events: AppEvent[] = (rawEvents ?? []).map((r) => stripLocalMeta(r as never));
    const sorted = sortEvents(events);
    const barrier = activeFaultBarrier(sorted);
    // Events d'avaria no tallats per la barrera de reset, més nous a dalt.
    const faultEvents = sorted.filter((e): e is FaultEvent => {
      if (
        e.type !== 'fault_report' &&
        e.type !== 'fault_update' &&
        e.type !== 'fault_resolve' &&
        e.type !== 'fault_barrier'
      ) {
        return false;
      }
      // La barrera mateixa sempre es mostra; els altres, només si no estan tallats.
      if (e.type === 'fault_barrier') return true;
      return !(barrier && compareKey(keyOf(e), barrier.cut) < 0);
    });
    return {
      rows: [...faultEvents].reverse(),
      faultsMap: deriveFaults(events),
    };
  }, [rawEvents]);

  // Filtra per una avaria concreta (Extra #4); les barreres es mostren sempre.
  const visibleRows = filterFaultId
    ? rows.filter((e) => e.type !== 'fault_barrier' && e.faultId === filterFaultId)
    : rows;

  if (rows.length === 0) {
    return <EmptyState icon={ScrollText} text={t.faults.historyEmpty} />;
  }

  const filteredTitle = filterFaultId ? faultsMap.get(filterFaultId)?.title : undefined;

  return (
    <div className="flex flex-col gap-3 pt-2">
      <h1 className="text-xl font-bold">{t.faults.historyTitle}</h1>

      {filterFaultId && (
        <div className="flex items-center justify-between rounded-xl bg-boat-100 px-3 py-2 text-sm">
          <span className="font-medium text-boat-700">
            {t.faults.filterBy(filteredTitle ?? '')}
          </span>
          <button
            type="button"
            onClick={() => setFilterFaultId(null)}
            className="text-boat-500 active:scale-95"
          >
            {t.faults.clearFilter}
          </button>
        </div>
      )}

      <ul className="flex flex-col gap-2">
        {visibleRows.map((e) =>
          e.type === 'fault_barrier' ? (
            <li key={e.id}>
              <Card className="border-l-4 border-boat-300 bg-boat-50">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 font-semibold text-boat-700">
                    <HistoryIcon size={16} />
                    {t.faults.resetEntryTitle}
                  </span>
                  <span className="text-boat-400">{relativeFromNow(e.occurredAt)}</span>
                </div>
                <div className="mt-1 text-xs text-boat-500">{e.userName}</div>
              </Card>
            </li>
          ) : (
            <li key={e.id}>
              <FaultEventCard
                event={e}
                fault={faultsMap.get(e.faultId)}
                onFilter={() => setFilterFaultId(e.faultId)}
              />
            </li>
          ),
        )}
      </ul>

      <ConfirmAction
        label={t.faults.resetAll}
        message={t.faults.resetConfirm}
        confirmLabel={t.faults.resetAll}
        icon={Trash2}
        variant="danger"
        onConfirm={() => (userName ? commitFaultReset(userName) : undefined)}
      />
    </div>
  );
}

/** Una fila de l'historial: tipus d'event + avaria + autor + data. Tocar-la filtra per l'avaria. */
function FaultEventCard({
  event,
  fault,
  onFilter,
}: {
  event: FaultReportEvent | FaultUpdateEvent | FaultResolveEvent;
  fault: DerivedFault | undefined;
  onFilter: () => void;
}) {
  const kind =
    event.type === 'fault_report'
      ? 'report'
      : event.type === 'fault_update'
        ? 'update'
        : 'resolve';
  const Icon = faultEventIcon(kind);
  const severity = fault?.severity;
  const title = fault?.title ?? '';

  return (
    <button type="button" onClick={onFilter} className="w-full text-left active:scale-[0.99]">
      <div className="flex overflow-hidden rounded-2xl bg-white shadow-sm">
        {severity && <div className={`w-1.5 shrink-0 ${SEVERITY_BAND[severity]}`} />}
        <div className="min-w-0 flex-1 p-3">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 font-semibold text-boat-700">
              <Icon size={16} />
              {t.faults.eventKind[kind]}
            </span>
            <span className="text-boat-400">{relativeFromNow(event.occurredAt)}</span>
          </div>
          <div className="mt-0.5 truncate text-sm">{title}</div>
          {event.type === 'fault_update' && (
            <p className="mt-1 whitespace-pre-wrap text-sm text-boat-600">{event.text}</p>
          )}
          <div className="mt-1 text-xs text-boat-400">{event.userName}</div>
        </div>
      </div>
    </button>
  );
}
