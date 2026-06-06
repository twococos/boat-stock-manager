import { supabase, isSupabaseConfigured } from './supabase';
import { rowToEvent, eventToBatchItem, type EventRow } from './mappers';
import { flushPendingPhotos } from './photoQueue';
import {
  getPendingEvents,
  markSynced,
  upsertRemoteEvents,
  stripLocalMeta,
} from '@/db/repositories/events.repo';
import { getMeta, putMeta } from '@/db/repositories/meta.repo';
import { recomputeAll } from '@/db/recompute';
import { nowISO } from '@/lib/time';

export interface SyncResult {
  ok: boolean;
  reason?: 'offline' | 'not-configured' | 'error';
  pushed?: number;
  pulled?: number;
  photos?: number;
  lastSyncedAt?: string;
  error?: unknown;
}

let inFlight: Promise<SyncResult> | null = null;

/**
 * Sincronitza el dispositiu amb el núvol.
 *
 * Passos (PLA.md secció 6):
 *   1. PUSH: empeny els esdeveniments locals pendents (idempotent per id via RPC).
 *   2. PULL: baixa els esdeveniments nous (server_seq > marca d'aigua), dedup per id.
 *   3. FOTOS: puja les fotos pendents fetes offline.
 *   4. RECOMPUTE: recalcula inventari + definicions a partir del log complet.
 *   5. Desa lastSyncedAt.
 *
 * Conflictes: pràcticament inexistents. Els esdeveniments són immutables i additius, i
 * el fold determinista + saturant per pas dóna un únic resultat per a qualsevol
 * intercalat. No hi ha UI de resolució de conflictes.
 *
 * És reentrant-safe: si ja hi ha una sincronització en curs, retorna la mateixa
 * promesa en lloc d'iniciar-ne una de nova.
 */
export function sync(): Promise<SyncResult> {
  if (inFlight) return inFlight;
  inFlight = runSync().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function runSync(): Promise<SyncResult> {
  if (!isSupabaseConfigured || !supabase) {
    return { ok: false, reason: 'not-configured' };
  }
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { ok: false, reason: 'offline' };
  }

  try {
    const meta = await getMeta();

    // ── 1. PUSH ──────────────────────────────────────────────────────────────
    const pending = await getPendingEvents();
    let pushed = 0;
    if (pending.length > 0) {
      const batch = pending.map((row) => eventToBatchItem(stripLocalMeta(row)));
      const { error } = await supabase.rpc('push_events', { batch });
      if (error) throw error;
      await markSynced(pending.map((p) => p.id));
      pushed = pending.length;
    }

    // ── 2. PULL ──────────────────────────────────────────────────────────────
    const { data, error: pullError } = await supabase
      .from('events')
      .select('*')
      .gt('server_seq', meta.lastServerSeq)
      .order('server_seq', { ascending: true });
    if (pullError) throw pullError;

    const rows = (data ?? []) as EventRow[];
    let pulled = 0;
    if (rows.length > 0) {
      await upsertRemoteEvents(rows.map(rowToEvent));
      meta.lastServerSeq = rows[rows.length - 1]!.server_seq;
      pulled = rows.length;
    }

    // ── 3. FOTOS ─────────────────────────────────────────────────────────────
    const photos = await flushPendingPhotos();

    // ── 4. RECOMPUTE ─────────────────────────────────────────────────────────
    if (pulled > 0 || pushed > 0) {
      await recomputeAll();
    }

    // ── 5. Desar estat ───────────────────────────────────────────────────────
    meta.lastSyncedAt = nowISO();
    await putMeta(meta);

    return {
      ok: true,
      pushed,
      pulled,
      photos,
      lastSyncedAt: meta.lastSyncedAt,
    };
  } catch (error) {
    return { ok: false, reason: 'error', error };
  }
}
