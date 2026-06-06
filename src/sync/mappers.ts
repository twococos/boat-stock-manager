import type { AppEvent } from '@/types/events';

/**
 * Mapatge entre les files de la taula `events` de Postgres i els AppEvent del client.
 *
 * El payload JSON de la fila JA conté l'AppEvent complet (la RPC `push_events` desa
 * l'esdeveniment sencer a la columna `payload`). Per tant, en baixar només cal llegir
 * `payload` i adjuntar-hi el `server_seq`.
 */

/** Fila tal com la retorna `select * from events`. */
export interface EventRow {
  server_seq: number;
  id: string;
  type: string;
  occurred_at: string;
  device_id: string;
  seq: number;
  user_name: string;
  payload: AppEvent;
  received_at: string;
}

/** Converteix una fila del servidor en un AppEvent amb el seu serverSeq. */
export function rowToEvent(row: EventRow): AppEvent & { _serverSeq: number } {
  return { ...row.payload, serverSeq: row.server_seq, _serverSeq: row.server_seq };
}

/**
 * Prepara un esdeveniment local per enviar-lo a la RPC `push_events`.
 * S'envia l'AppEvent net (sense les metadades locals `_pending`/`_serverSeq`).
 */
export function eventToBatchItem(event: AppEvent): Record<string, unknown> {
  // El servidor llegeix els camps de primer nivell (id, type, occurredAt, deviceId,
  // seq, userName) i desa l'objecte sencer com a payload.
  const { serverSeq, ...rest } = event;
  void serverSeq;
  return rest as Record<string, unknown>;
}
