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

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Purga esdeveniments `*_upsert` el payload dels quals té un id que no és un UUID
 * vàlid. El trigger de mirall de Supabase casta `payload.id` a uuid, així que un id
 * no-UUID fa fallar el push i bloqueja TOT el sync indefinidament (l'esdeveniment
 * dolent es reintenta a cada cicle). Una versió primerenca de la foto de capçalera
 * de Llocs feia servir un id no-UUID; aquesta neteja única treu aquells esdeveniments
 * encallats. És idempotent i inofensiva si no n'hi ha cap. Retorna quants n'ha tret.
 */
export async function purgeNonUuidUpserts(): Promise<number> {
  const rows = await db.events.toArray();
  const bad = rows.filter((r) => {
    if (!r.type.endsWith('_upsert')) return false;
    const id = (r as { payload?: { id?: unknown } }).payload?.id;
    return typeof id === 'string' && !UUID_RE.test(id);
  });
  if (bad.length > 0) {
    await db.events.bulkDelete(bad.map((r) => r.id));
  }
  return bad.length;
}
