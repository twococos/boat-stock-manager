import { useSync } from '@/sync/SyncProvider';
import { relativeFromNow } from '@/lib/time';
import { t } from '@/text';

/**
 * Indicador de sincronització: mostra l'estat, l'hora de l'última sync i els canvis
 * pendents. Requisit explícit: informar de quan s'ha fet l'última sincronització.
 * Veure PLA.md (secció 9).
 */
export function SyncIndicator() {
  const { status, lastSyncedAt, pendingCount, online, syncNow } = useSync();

  let label: string;
  let dot: string;
  switch (status) {
    case 'syncing':
      label = t.sync.syncing;
      dot = 'bg-amber-400';
      break;
    case 'offline':
      label = t.sync.offline;
      dot = 'bg-gray-400';
      break;
    case 'error':
      label = t.sync.error;
      dot = 'bg-red-500';
      break;
    case 'not-configured':
      label = t.sync.localMode;
      dot = 'bg-gray-300';
      break;
    default:
      label = lastSyncedAt
        ? t.sync.syncedRel(relativeFromNow(lastSyncedAt))
        : t.sync.neverSynced;
      dot = online ? 'bg-green-500' : 'bg-gray-400';
  }

  return (
    <button
      onClick={() => void syncNow()}
      className="flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-xs text-boat-700 shadow-sm active:scale-95"
      title={t.sync.syncNowAria}
    >
      <span className={`inline-block h-2 w-2 rounded-full ${dot}`} />
      <span>{label}</span>
      {pendingCount > 0 && (
        <span className="rounded-full bg-amber-200 px-1.5 font-semibold text-amber-900">
          {pendingCount}
        </span>
      )}
    </button>
  );
}
