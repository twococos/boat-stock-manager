import { db, type SyncMeta } from '../db';
import { getDeviceId } from '@/lib/deviceId';

const META_KEY = 'sync';

/** Obté (o inicialitza) la fila de metadades de sincronització. */
export async function getMeta(): Promise<SyncMeta> {
  const existing = await db.meta.get(META_KEY);
  if (existing) return existing;
  const fresh: SyncMeta = {
    key: META_KEY,
    lastServerSeq: 0,
    deviceId: getDeviceId(),
    localSeq: 0,
  };
  await db.meta.put(fresh);
  return fresh;
}

/** Desa la fila de metadades. */
export async function putMeta(meta: SyncMeta): Promise<void> {
  await db.meta.put({ ...meta, key: META_KEY });
}

/**
 * Reserva el següent `seq` monòton per a aquest dispositiu de forma atòmica.
 *
 * S'executa dins una transacció rw sobre `meta` per evitar curses entre escriptures
 * concurrents. Retorna el nou valor de seq.
 */
export async function nextLocalSeq(): Promise<number> {
  return db.transaction('rw', db.meta, async () => {
    const meta = await getMeta();
    const next = meta.localSeq + 1;
    await db.meta.put({ ...meta, localSeq: next });
    return next;
  });
}
