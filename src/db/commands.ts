import type {
  ItemObject,
  StowageLocation,
  Recipe,
  ChecklistTemplate,
  ResourceConfig,
  WaterTank,
  ID,
} from '@/types/entities';
import type { AppEvent, StockDeltaLine, StockDeltaReason, OrderKey } from '@/types/events';
import {
  makeStockDeltaEvent,
  makeStockBarrierEvent,
  makeObjectUpsertEvent,
  makeLocationUpsertEvent,
  makeRecipeUpsertEvent,
  makeChecklistUpsertEvent,
  makeObjectDeleteEvent,
  makeLocationDeleteEvent,
  makeRecipeDeleteEvent,
  makeChecklistDeleteEvent,
  makeResourceConfigUpsertEvent,
  makeFuelMeasureEvent,
  makeWaterMeasureEvent,
  makeWaterRefillEvent,
  makeGasMeasureEvent,
  makeGasSwapEvent,
  type EventContext,
} from '@/domain/events/factories';
import { addLocalEvent, purgeBeforeBarrier } from './repositories/events.repo';
import { getMeta, nextLocalSeq } from './repositories/meta.repo';
import { recomputeAll } from './recompute';
import { requestServerReset } from '@/sync/syncEngine';
import { nowISO } from '@/lib/time';

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

// ── barreres de tall (rebobinar / esborrar historial d'estoc) ────────────────
/**
 * Rebobina l'estoc fins a un event de l'historial: emet una barrera `rewind` que fa que la
 * derivació ignori els stock_delta posteriors a `target` (l'event diana es conserva). No
 * esborra res; és reversible emetent un rewind a un punt més recent.
 */
export async function commitStockRewind(
  userName: string,
  target: OrderKey,
  targetEventId: ID,
): Promise<void> {
  const ctx = await buildContext(userName);
  await commit(makeStockBarrierEvent(ctx, 'rewind', target, targetEventId));
}

/**
 * Reinicia tot l'estoc a 0: emet una barrera `reset` (que ignora tot el passat) i després
 * fa neteja física best-effort (local + servidor) esborrant els stock_delta i barreres
 * vells, conservant la barrera de reset nova com a salvaguarda. NOMÉS afecta l'estoc;
 * objectes/llocs/receptes/checklists es conserven.
 */
export async function commitStockReset(userName: string): Promise<void> {
  const base = await buildContext(userName);
  const ctx = { ...base, occurredAt: nowISO() };
  const cut: OrderKey = { occurredAt: ctx.occurredAt, deviceId: ctx.deviceId, seq: ctx.seq };
  const event = makeStockBarrierEvent(ctx, 'reset', cut, null);
  await commit(event);
  // Neteja física oportunista (no afecta la correcció; la garanteix la barrera).
  await purgeBeforeBarrier(cut, event.id);
  await requestServerReset(cut, event.id);
  await recomputeAll();
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

// ── recursos continus (gasoil, aigua de tancs, gas) ──────────────────────────
export async function commitResourceConfig(
  userName: string,
  payload: ResourceConfig,
): Promise<void> {
  const ctx = await buildContext(userName);
  await commit(makeResourceConfigUpsertEvent(ctx, payload));
}

export async function commitFuelMeasure(
  userName: string,
  data: { percent?: number; refillToFull?: boolean; addedLiters?: number },
): Promise<void> {
  const ctx = await buildContext(userName);
  await commit(makeFuelMeasureEvent(ctx, data));
}

export async function commitWaterMeasure(
  userName: string,
  counter: number,
  activeTank: WaterTank,
): Promise<void> {
  const ctx = await buildContext(userName);
  await commit(makeWaterMeasureEvent(ctx, counter, activeTank));
}

export async function commitWaterRefill(
  userName: string,
  tank: WaterTank,
  data: { toFull?: boolean; addedLiters?: number },
): Promise<void> {
  const ctx = await buildContext(userName);
  await commit(makeWaterRefillEvent(ctx, tank, data));
}

export async function commitGasMeasure(
  userName: string,
  weightKg: number,
): Promise<void> {
  const ctx = await buildContext(userName);
  await commit(makeGasMeasureEvent(ctx, weightKg));
}

export async function commitGasSwap(userName: string): Promise<void> {
  const ctx = await buildContext(userName);
  await commit(makeGasSwapEvent(ctx));
}
