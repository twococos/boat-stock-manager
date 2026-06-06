import { db, type LocalEvent } from '../db';
import type { AppEvent } from '@/types/events';

/** Afegeix un esdeveniment local nou (pendent de sincronitzar). */
export async function addLocalEvent(event: AppEvent): Promise<void> {
  const row: LocalEvent = { ...event, _pending: 1 };
  await db.events.put(row);
}

/** Tots els esdeveniments (com a AppEvent, sense les metadades locals). */
export async function getAllEvents(): Promise<AppEvent[]> {
  const rows = await db.events.toArray();
  return rows.map(stripLocalMeta);
}

/** Esdeveniments encara no sincronitzats (cua de push). */
export async function getPendingEvents(): Promise<LocalEvent[]> {
  return db.events.where('_pending').equals(1).toArray();
}

/** Marca un conjunt d'esdeveniments com a sincronitzats. */
export async function markSynced(ids: string[]): Promise<void> {
  await db.transaction('rw', db.events, async () => {
    for (const id of ids) {
      const row = await db.events.get(id);
      if (row) await db.events.put({ ...row, _pending: 0 });
    }
  });
}

/**
 * Insereix esdeveniments baixats del servidor, deduplicant per `id`.
 *
 * `put` actua com a upsert: si l'esdeveniment ja existeix localment (p.ex. un que vam
 * crear nosaltres i ara torna del servidor), s'actualitza sense duplicar-se.
 */
export async function upsertRemoteEvents(
  events: Array<AppEvent & { _serverSeq?: number }>,
): Promise<void> {
  const rows: LocalEvent[] = events.map((e) => ({
    ...e,
    _pending: 0,
    _serverSeq: e._serverSeq,
  }));
  await db.events.bulkPut(rows);
}

/** Treu les metadades locals (`_pending`, `_serverSeq`) deixant un AppEvent net. */
export function stripLocalMeta(row: LocalEvent): AppEvent {
  const { _pending, _serverSeq, ...event } = row;
  void _pending;
  void _serverSeq;
  return event as AppEvent;
}
