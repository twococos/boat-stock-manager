import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import { sync } from './syncEngine';
import { isSupabaseConfigured } from './supabase';
import { getMeta } from '@/db/repositories/meta.repo';

type SyncStatus = 'idle' | 'syncing' | 'offline' | 'error' | 'not-configured';

interface SyncContextValue {
  status: SyncStatus;
  lastSyncedAt: string | null;
  pendingCount: number;
  online: boolean;
  syncNow: () => Promise<void>;
}

const SyncContext = createContext<SyncContextValue | null>(null);

const AUTO_SYNC_INTERVAL_MS = 60_000;

export function SyncProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SyncStatus>(
    isSupabaseConfigured ? 'idle' : 'not-configured',
  );
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [online, setOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );
  const timerRef = useRef<number | null>(null);

  // Compta esdeveniments pendents de forma reactiva.
  const pendingCount =
    useLiveQuery(() => db.events.where('_pending').equals(1).count(), [], 0) ?? 0;

  const syncNow = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setStatus('not-configured');
      return;
    }
    setStatus('syncing');
    const result = await sync();
    if (result.ok) {
      setStatus('idle');
      if (result.lastSyncedAt) setLastSyncedAt(result.lastSyncedAt);
    } else if (result.reason === 'offline') {
      setStatus('offline');
    } else if (result.reason === 'not-configured') {
      setStatus('not-configured');
    } else {
      setStatus('error');
    }
  }, []);

  // Carregar l'últim lastSyncedAt persistit.
  useEffect(() => {
    void getMeta().then((m) => {
      if (m.lastSyncedAt) setLastSyncedAt(m.lastSyncedAt);
    });
  }, []);

  // Disparadors: inici, online/offline, interval.
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    void syncNow();

    const onOnline = () => {
      setOnline(true);
      void syncNow();
    };
    const onOffline = () => {
      setOnline(false);
      setStatus('offline');
    };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    timerRef.current = window.setInterval(() => {
      if (navigator.onLine) void syncNow();
    }, AUTO_SYNC_INTERVAL_MS);

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [syncNow]);

  const value = useMemo<SyncContextValue>(
    () => ({ status, lastSyncedAt, pendingCount, online, syncNow }),
    [status, lastSyncedAt, pendingCount, online, syncNow],
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync(): SyncContextValue {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error('useSync s\'ha d\'usar dins d\'un SyncProvider');
  return ctx;
}
