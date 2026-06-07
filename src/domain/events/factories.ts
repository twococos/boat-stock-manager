import type {
  ItemObject,
  StowageLocation,
  Recipe,
  ChecklistTemplate,
  ResourceConfig,
  WaterTank,
  ID,
} from '@/types/entities';
import type {
  StockDeltaEvent,
  StockDeltaLine,
  StockDeltaReason,
  StockBarrierEvent,
  StockBarrierMode,
  OrderKey,
  ObjectUpsertEvent,
  LocationUpsertEvent,
  RecipeUpsertEvent,
  ChecklistUpsertEvent,
  ObjectDeleteEvent,
  LocationDeleteEvent,
  RecipeDeleteEvent,
  ChecklistDeleteEvent,
  ResourceConfigUpsertEvent,
  FuelMeasureEvent,
  WaterMeasureEvent,
  WaterRefillEvent,
  GasMeasureEvent,
  GasSwapEvent,
} from '@/types/events';
import { newId } from '@/lib/id';
import { nowISO } from '@/lib/time';

/**
 * Factories d'esdeveniments.
 *
 * El domini és pur: aquestes funcions no fan I/O. El context d'autoria (`deviceId`,
 * `userName`, `seq`) s'injecta com a paràmetre. El `seq` (comptador monòton per
 * dispositiu) i la persistència els resol la capa Dexie (Fase 3); aquí només es
 * construeix l'objecte esdeveniment ben format.
 */
export interface EventContext {
  deviceId: string;
  userName: string;
  seq: number;
  /** Override opcional de la marca de temps (per a tests / seed); per defecte ara. */
  occurredAt?: string;
}

function base(ctx: EventContext) {
  return {
    id: newId(),
    occurredAt: ctx.occurredAt ?? nowISO(),
    deviceId: ctx.deviceId,
    userName: ctx.userName,
    seq: ctx.seq,
    serverSeq: null,
  };
}

// ── deltes d'estoc ───────────────────────────────────────────────────────────
export function makeStockDeltaEvent(
  ctx: EventContext,
  reason: StockDeltaReason,
  lines: StockDeltaLine[],
  extra?: { recipeId?: ID; diners?: number },
): StockDeltaEvent {
  return {
    ...base(ctx),
    type: 'stock_delta',
    reason,
    lines,
    ...(extra?.recipeId !== undefined ? { recipeId: extra.recipeId } : {}),
    ...(extra?.diners !== undefined ? { diners: extra.diners } : {}),
  };
}

// ── barreres de tall (rebobinar / esborrar historial d'estoc) ────────────────
export function makeStockBarrierEvent(
  ctx: EventContext,
  mode: StockBarrierMode,
  cut: OrderKey,
  targetEventId?: ID | null,
): StockBarrierEvent {
  return {
    ...base(ctx),
    type: 'stock_barrier',
    mode,
    cut,
    ...(targetEventId !== undefined ? { targetEventId } : {}),
  };
}

// ── upserts de definició (snapshot complet) ──────────────────────────────────
export function makeObjectUpsertEvent(
  ctx: EventContext,
  payload: ItemObject,
): ObjectUpsertEvent {
  return { ...base(ctx), type: 'object_upsert', payload };
}

export function makeLocationUpsertEvent(
  ctx: EventContext,
  payload: StowageLocation,
): LocationUpsertEvent {
  return { ...base(ctx), type: 'location_upsert', payload };
}

export function makeRecipeUpsertEvent(
  ctx: EventContext,
  payload: Recipe,
): RecipeUpsertEvent {
  return { ...base(ctx), type: 'recipe_upsert', payload };
}

export function makeChecklistUpsertEvent(
  ctx: EventContext,
  payload: ChecklistTemplate,
): ChecklistUpsertEvent {
  return { ...base(ctx), type: 'checklist_upsert', payload };
}

// ── deletes de definició (tombstone) ─────────────────────────────────────────
export function makeObjectDeleteEvent(
  ctx: EventContext,
  targetId: ID,
): ObjectDeleteEvent {
  return { ...base(ctx), type: 'object_delete', targetId };
}

export function makeLocationDeleteEvent(
  ctx: EventContext,
  targetId: ID,
): LocationDeleteEvent {
  return { ...base(ctx), type: 'location_delete', targetId };
}

export function makeRecipeDeleteEvent(
  ctx: EventContext,
  targetId: ID,
): RecipeDeleteEvent {
  return { ...base(ctx), type: 'recipe_delete', targetId };
}

export function makeChecklistDeleteEvent(
  ctx: EventContext,
  targetId: ID,
): ChecklistDeleteEvent {
  return { ...base(ctx), type: 'checklist_delete', targetId };
}

// ── recursos continus (gasoil, aigua de tancs, gas) ──────────────────────────
export function makeResourceConfigUpsertEvent(
  ctx: EventContext,
  payload: ResourceConfig,
): ResourceConfigUpsertEvent {
  return { ...base(ctx), type: 'resource_config_upsert', payload };
}

export function makeFuelMeasureEvent(
  ctx: EventContext,
  data: { percent?: number; refillToFull?: boolean; addedLiters?: number },
): FuelMeasureEvent {
  return {
    ...base(ctx),
    type: 'fuel_measure',
    ...(data.percent !== undefined ? { percent: data.percent } : {}),
    ...(data.refillToFull !== undefined ? { refillToFull: data.refillToFull } : {}),
    ...(data.addedLiters !== undefined ? { addedLiters: data.addedLiters } : {}),
  };
}

export function makeWaterMeasureEvent(
  ctx: EventContext,
  counter: number,
  activeTank: WaterTank,
): WaterMeasureEvent {
  return { ...base(ctx), type: 'water_measure', counter, activeTank };
}

export function makeWaterRefillEvent(
  ctx: EventContext,
  tank: WaterTank,
  data: { toFull?: boolean; addedLiters?: number },
): WaterRefillEvent {
  return {
    ...base(ctx),
    type: 'water_refill',
    tank,
    ...(data.toFull !== undefined ? { toFull: data.toFull } : {}),
    ...(data.addedLiters !== undefined ? { addedLiters: data.addedLiters } : {}),
  };
}

export function makeGasMeasureEvent(
  ctx: EventContext,
  weightKg: number,
): GasMeasureEvent {
  return { ...base(ctx), type: 'gas_measure', weightKg };
}

export function makeGasSwapEvent(ctx: EventContext): GasSwapEvent {
  return { ...base(ctx), type: 'gas_swap' };
}
