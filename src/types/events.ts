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
  | 'object_upsert'
  | 'location_upsert'
  | 'recipe_upsert'
  | 'checklist_upsert';

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

// ── unió discriminada ────────────────────────────────────────────────────────
export type AppEvent =
  | StockDeltaEvent
  | ObjectUpsertEvent
  | LocationUpsertEvent
  | RecipeUpsertEvent
  | ChecklistUpsertEvent;
