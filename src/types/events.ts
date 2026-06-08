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
  ResourceConfig,
  WaterTank,
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
  | 'checklist_delete'
  // ── recursos continus (gasoil, aigua de tancs, gas) ──
  | 'resource_config_upsert' // config sincronitzada d'un recurs (capacitats, pesos)
  | 'fuel_measure' // mesura de gasoil (%) o omplir (PLE / litres)
  | 'water_measure' // lectura del comptador d'aigua + tanc actiu del tram
  | 'water_refill' // omplir un tanc (PLE / litres)
  | 'gas_measure' // pes actual de la bombona
  | 'gas_swap' // canvi de bombona (reset a plena)
  // ── avaries ──
  | 'fault_report' // reportar (crear) una avaria
  | 'fault_update' // actualització follow-up lligada a una avaria
  | 'fault_resolve' // solucionar una avaria
  | 'fault_barrier' // reset de l'historial d'avaries (anàleg a stock_barrier 'reset')
  // ── llista de la compra ──
  | 'shopping_add' // afegeix/edita la quantitat d'un objecte a la llista (delta amb signe)
  | 'shopping_remove' // treu del tot un objecte de la llista
  | 'shopping_bought' // marca comprat → treu de la llista (l'stock_delta de compra va a part)
  | 'shopping_barrier'; // buidar tota la llista (anàleg a fault_barrier)

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

// ── recursos continus (gasoil, aigua de tancs, gas) ──────────────────────────
// Mesures ABSOLUTES (no deltes). La derivació reprodueix-les en ordre per obtenir l'estat
// actual i el consum. La config (capacitats/pesos) és un upsert sincronitzat. Veure
// src/domain/resources/.

/** Config sincronitzada d'un recurs (snapshot complet com a "delta"; last-writer-wins). */
export interface ResourceConfigUpsertEvent extends EventBase {
  type: 'resource_config_upsert';
  payload: ResourceConfig;
}

/**
 * Mesura de gasoil. O bé una lectura de nivell (`percent`), o bé un omplir: `refillToFull`
 * (PLE) o `addedLiters` (litres afegits sobre l'últim nivell). Exactament un dels tres.
 */
export interface FuelMeasureEvent extends EventBase {
  type: 'fuel_measure';
  percent?: number; // 0..100
  refillToFull?: boolean;
  addedLiters?: number;
}

/**
 * Lectura del comptador d'aigua. `counter` és el número del comptador analògic (sortida
 * comuna); `activeTank` és el tanc del qual s'ha consumit fins ara. El consum del tram
 * (counter − comptador anterior) s'atribueix a `activeTank`. Canviar de tanc obliga a
 * emetre una mesura amb el comptador actual i el tanc nou (tanca el tram anterior net).
 */
export interface WaterMeasureEvent extends EventBase {
  type: 'water_measure';
  counter: number;
  activeTank: WaterTank;
}

/** Omplir un tanc d'aigua: PLE (`toFull`) o `addedLiters`. */
export interface WaterRefillEvent extends EventBase {
  type: 'water_refill';
  tank: WaterTank;
  toFull?: boolean;
  addedLiters?: number;
}

/** Pes actual de la bombona de gas (kg). */
export interface GasMeasureEvent extends EventBase {
  type: 'gas_measure';
  weightKg: number;
}

/** Canvi de bombona de gas: torna a plena. */
export interface GasSwapEvent extends EventBase {
  type: 'gas_swap';
}

// ── avaries ──────────────────────────────────────────────────────────────────
// Una avaria NO és una entitat amb estat guardat: el seu estat (activa/solucionada,
// descripció, updates) es DERIVA del log com tota la resta. El `faultId` és l'id del
// propi `fault_report`; els updates i el resolve hi referencien. Veure src/domain/faults/.

/** Gravetat d'una avaria (banda de color de la targeta). */
export type FaultSeverity = 'yellow' | 'orange' | 'red';

/** Reportar (crear) una avaria. La data/hora és `occurredAt`; l'autor, `userName`. */
export interface FaultReportEvent extends EventBase {
  type: 'fault_report';
  faultId: ID; // = id lògic de l'avaria (per conveni, igual a l'id de l'event)
  title: string;
  description: string;
  severity: FaultSeverity;
}

/** Actualització follow-up lligada a una avaria (registra data/hora i autor). */
export interface FaultUpdateEvent extends EventBase {
  type: 'fault_update';
  faultId: ID;
  text: string;
}

/** Solucionar una avaria (definitiu: surt de la llista d'actives). */
export interface FaultResolveEvent extends EventBase {
  type: 'fault_resolve';
  faultId: ID;
}

/**
 * Reset de l'historial d'avaries. Anàleg a StockBarrierEvent mode 'reset': fa que la
 * derivació IGNORI tots els events fault_* amb clau d'ordre < cut. No hi ha mode 'rewind'
 * per a avaries. La barrera es conserva com a salvaguarda determinista (multi-dispositiu
 * offline); a més es fa neteja física (local + RPC). Veure derive de faults i commands.
 */
export interface FaultBarrierEvent extends EventBase {
  type: 'fault_barrier';
  cut: OrderKey; // s'ignoren els fault_* amb clau < cut (tot el passat)
}

// ── llista de la compra ──────────────────────────────────────────────────────
// Un ítem de la llista NO és una entitat amb id propi: la quantitat per objecte es DERIVA
// agregant els deltes de shopping_add (saturats a 0) i filtrant els removed/bought. Sempre
// referencien un objectId del catàleg (no text lliure). Veure src/domain/shopping/.

/** Afegeix (o edita, amb delta negatiu) la quantitat d'un objecte a la llista de la compra. */
export interface ShoppingAddEvent extends EventBase {
  type: 'shopping_add';
  objectId: ID;
  delta: number; // amb signe: +N afegeix, -N redueix (editar amb el NumberStepper)
}

/** Treu del tot un objecte de la llista (tombstone lògic; anul·la la quantitat acumulada). */
export interface ShoppingRemoveEvent extends EventBase {
  type: 'shopping_remove';
  objectId: ID;
}

/**
 * Marca un objecte com a comprat: surt de la llista. L'entrada a l'estoc és un stock_delta
 * separat emès atòmicament pel mateix command (commitShoppingBought).
 */
export interface ShoppingBoughtEvent extends EventBase {
  type: 'shopping_bought';
  objectId: ID;
  qty: number; // unitats comprades (= quantitat que tenia a la llista en aquell moment)
}

/**
 * Buidar tota la llista. Anàleg a FaultBarrierEvent: la derivació IGNORA tots els events
 * shopping_* amb clau d'ordre < cut. La barrera es conserva com a salvaguarda determinista.
 */
export interface ShoppingBarrierEvent extends EventBase {
  type: 'shopping_barrier';
  cut: OrderKey; // s'ignoren els shopping_* amb clau < cut (tot el passat)
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
  | ChecklistDeleteEvent
  | ResourceConfigUpsertEvent
  | FuelMeasureEvent
  | WaterMeasureEvent
  | WaterRefillEvent
  | GasMeasureEvent
  | GasSwapEvent
  | FaultReportEvent
  | FaultUpdateEvent
  | FaultResolveEvent
  | FaultBarrierEvent
  | ShoppingAddEvent
  | ShoppingRemoveEvent
  | ShoppingBoughtEvent
  | ShoppingBarrierEvent;
