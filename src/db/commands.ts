import type {
  ItemObject,
  StowageLocation,
  Recipe,
  ChecklistTemplate,
  ID,
} from '@/types/entities';
import type { AppEvent, StockDeltaLine, StockDeltaReason } from '@/types/events';
import {
  makeStockDeltaEvent,
  makeObjectUpsertEvent,
  makeLocationUpsertEvent,
  makeRecipeUpsertEvent,
  makeChecklistUpsertEvent,
  makeObjectDeleteEvent,
  makeLocationDeleteEvent,
  makeRecipeDeleteEvent,
  makeChecklistDeleteEvent,
  type EventContext,
} from '@/domain/events/factories';
import { addLocalEvent } from './repositories/events.repo';
import { getMeta, nextLocalSeq } from './repositories/meta.repo';
import { recomputeAll } from './recompute';

/**
 * Capa de comandes: porta ÚNICA d'escriptura per a la UI.
 *
 * Cada comanda: reserva un `seq` monòton → construeix l'esdeveniment amb la factory del
 * domini → el desa a Dexie (pendent) → recalcula les caus derivades. La UI sempre
 * escriu aquí (mai a Supabase directament); la sincronització és en segon pla.
 *
 * El context d'autoria (`deviceId`, `userName`) s'obté de meta + sessió. El `userName`
 * s'injecta des de la capa d'auth en cada crida.
 */
async function buildContext(userName: string): Promise<EventContext> {
  const meta = await getMeta();
  const seq = await nextLocalSeq();
  return { deviceId: meta.deviceId, userName, seq };
}

/** Desa un esdeveniment ja construït i recalcula. */
async function commit(event: AppEvent): Promise<void> {
  await addLocalEvent(event);
  await recomputeAll();
}

// ── deltes d'estoc ───────────────────────────────────────────────────────────
export async function commitStockDelta(
  userName: string,
  reason: StockDeltaReason,
  lines: StockDeltaLine[],
  extra?: { recipeId?: ID; diners?: number },
): Promise<void> {
  const ctx = await buildContext(userName);
  await commit(makeStockDeltaEvent(ctx, reason, lines, extra));
}

// ── upserts de definició ─────────────────────────────────────────────────────
export async function commitObjectUpsert(
  userName: string,
  payload: ItemObject,
): Promise<void> {
  const ctx = await buildContext(userName);
  await commit(makeObjectUpsertEvent(ctx, payload));
}

export async function commitLocationUpsert(
  userName: string,
  payload: StowageLocation,
): Promise<void> {
  const ctx = await buildContext(userName);
  await commit(makeLocationUpsertEvent(ctx, payload));
}

export async function commitRecipeUpsert(
  userName: string,
  payload: Recipe,
): Promise<void> {
  const ctx = await buildContext(userName);
  await commit(makeRecipeUpsertEvent(ctx, payload));
}

export async function commitChecklistUpsert(
  userName: string,
  payload: ChecklistTemplate,
): Promise<void> {
  const ctx = await buildContext(userName);
  await commit(makeChecklistUpsertEvent(ctx, payload));
}

// ── deletes de definició ─────────────────────────────────────────────────────
// L'eliminació en cascada (treure l'objecte de les receptes, el lloc dels objectes)
// la resol la derivació a deriveDefinitions; aquí només s'emet el tombstone.
export async function commitObjectDelete(
  userName: string,
  id: ID,
): Promise<void> {
  const ctx = await buildContext(userName);
  await commit(makeObjectDeleteEvent(ctx, id));
}

export async function commitLocationDelete(
  userName: string,
  id: ID,
): Promise<void> {
  const ctx = await buildContext(userName);
  await commit(makeLocationDeleteEvent(ctx, id));
}

export async function commitRecipeDelete(
  userName: string,
  id: ID,
): Promise<void> {
  const ctx = await buildContext(userName);
  await commit(makeRecipeDeleteEvent(ctx, id));
}

export async function commitChecklistDelete(
  userName: string,
  id: ID,
): Promise<void> {
  const ctx = await buildContext(userName);
  await commit(makeChecklistDeleteEvent(ctx, id));
}
