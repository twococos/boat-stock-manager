// ─────────────────────────────────────────────────────────────────────────────
// Tipus del log d'esdeveniments (event sourcing).
//
// Tot canvi a l'estat de l'app és un esdeveniment append-only. L'inventari es deriva
// reproduint aquests esdeveniments. Veure PLA.md (seccions 3 i 5).
// ─────────────────────────────────────────────────────────────────────────────

import type {
  ID,
  ISOTimestamp,
  DeviceID,
  UserName,
  ItemObject,
  StowageLocation,
  Recipe,
  ChecklistTemplate,
} from './entities';

export type EventType =
  | 'stock_delta' // canvi d'estoc unificat (cuinar/comprar/ajustar)
  | 'stock_barrier' // barrera de tall: rebobinar / esborrar historial d'estoc
  | 'object_upsert'
  | 'location_upsert'
  | 'recipe_upsert'
  | 'checklist_upsert'
  | 'object_delete'
  | 'location_delete'
  | 'recipe_delete'
  | 'checklist_delete';

/** Sobre comú a TOTS els esdeveniments (fila append-only del log). */
export interface EventBase {
  id: ID; // UUID v7 — també clau de dedup
  type: EventType;
  occurredAt: ISOTimestamp; // rellotge del dispositiu quan va passar l'acció (ordre)
  deviceId: DeviceID; // desempat + comptabilitat de clock skew
  userName: UserName; // QUI ho va fer (nom lliure)
  seq: number; // comptador monòton per dispositiu (desempat robust)
  serverSeq?: number | null; // assignat pel servidor en inserir (null fins sync)
}

// ── deltes d'estoc ───────────────────────────────────────────────────────────
export type StockDeltaReason = 'cooking' | 'purchase' | 'adjustment';

export interface StockDeltaLine {
  objectId: ID;
  delta: number; // amb signe; consum = negatiu, afegir = positiu
  expiresAt?: ISOTimestamp; // info de lot en afegir menjar amb data
}

export interface StockDeltaEvent extends EventBase {
  type: 'stock_delta';
  reason: StockDeltaReason;
  lines: StockDeltaLine[]; // una acció pot tocar molts objectes alhora
  recipeId?: ID; // quan reason='cooking' o compra per recepta
  diners?: number; // persones per a qui s'ha cuinat
}

// ── barreres de tall (rebobinar / esborrar historial d'estoc) ────────────────
// Una barrera fa que la derivació IGNORI certs stock_delta sense esborrar-los (la
// correcció és determinista). 'rewind' conserva l'event diana i ignora els posteriors;
// 'reset' ignora tot el passat. Veure derive.ts. NOMÉS afecta l'estoc (stock_delta);
// objectes/llocs/receptes/checklists no es toquen mai.
export type StockBarrierMode = 'rewind' | 'reset';

/** Clau d'ordre determinista d'un esdeveniment (la mateixa que compareEvents). */
export interface OrderKey {
  occurredAt: ISOTimestamp;
  deviceId: DeviceID;
  seq: number;
}

export interface StockBarrierEvent extends EventBase {
  type: 'stock_barrier';
  mode: StockBarrierMode;
  // Punt de tall. rewind: clau de l'event diana → s'ignoren els stock_delta amb clau
  // ESTRICTAMENT > cut. reset: clau del propi event → s'ignoren els stock_delta amb
  // clau < cut (tot el passat). Es guarda la clau completa (no l'id) perquè la barrera
  // sigui determinista encara que l'event diana no hagi arribat per sync.
  cut: OrderKey;
  targetEventId?: ID | null; // event diana clicat (rewind); null en reset
}

// ── upserts de definició (snapshot complet com a "delta") ────────────────────
export interface ObjectUpsertEvent extends EventBase {
  type: 'object_upsert';
  payload: ItemObject;
}

export interface LocationUpsertEvent extends EventBase {
  type: 'location_upsert';
  payload: StowageLocation;
}

export interface RecipeUpsertEvent extends EventBase {
  type: 'recipe_upsert';
  payload: Recipe;
}

export interface ChecklistUpsertEvent extends EventBase {
  type: 'checklist_upsert';
  payload: ChecklistTemplate;
}

// ── deletes de definició (tombstone; porten només l'id objectiu) ─────────────
export interface ObjectDeleteEvent extends EventBase {
  type: 'object_delete';
  targetId: ID;
}

export interface LocationDeleteEvent extends EventBase {
  type: 'location_delete';
  targetId: ID;
}

export interface RecipeDeleteEvent extends EventBase {
  type: 'recipe_delete';
  targetId: ID;
}

export interface ChecklistDeleteEvent extends EventBase {
  type: 'checklist_delete';
  targetId: ID;
}

// ── unió discriminada ────────────────────────────────────────────────────────
export type AppEvent =
  | StockDeltaEvent
  | StockBarrierEvent
  | ObjectUpsertEvent
  | LocationUpsertEvent
  | RecipeUpsertEvent
  | ChecklistUpsertEvent
  | ObjectDeleteEvent
  | LocationDeleteEvent
  | RecipeDeleteEvent
  | ChecklistDeleteEvent;
