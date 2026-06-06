// ─────────────────────────────────────────────────────────────────────────────
// Tipus de les entitats del domini.
//
// Aquest fitxer és part de la única font de veritat dels tipus de l'app. Veure el
// document PLA.md (secció 5) per al context complet.
// ─────────────────────────────────────────────────────────────────────────────

// ── primitius ───────────────────────────────────────────────────────────────
export type ID = string; // UUID v7 (ordenable per temps)
export type ISOTimestamp = string;
export type DeviceID = string;
export type UserName = string; // nom lliure visible, NO un compte

export type StockType = 'food' | 'consumable' | 'tools' | 'other';
export type QuantityType = 'units' | 'kg' | 'L';

export type FoodCategory =
  | 'fridge'
  | 'snacks'
  | 'canned'
  | 'fruit'
  | 'vegetables'
  | 'breakfast'
  | 'dessert'
  | 'water'
  | 'other';

/**
 * Gestió de caducitat (només menjar).
 * - `never`: no caduca.
 * - `days_from_purchase`: caduca N dies després de la compra (p.ex. conserva: 365).
 * - `define_on_add`: la data es defineix en cada compra (p.ex. iogurt amb data impresa).
 */
export type ExpiryPolicy =
  | { mode: 'never' }
  | { mode: 'days_from_purchase'; days: number }
  | { mode: 'define_on_add' };

// ── llocs d'estiva ───────────────────────────────────────────────────────────
export interface StowageLocation {
  id: ID;
  name: string;
  description?: string;
  photoPath?: string; // ruta a Supabase Storage
  parentId?: ID | null; // jerarquia opcional (no obligatòria)
  createdAt: ISOTimestamp;
  updatedAt: ISOTimestamp;
}

// ── definició d'objecte (el catàleg) ─────────────────────────────────────────
export interface ItemObject {
  id: ID;
  name: string;
  icon?: string; // emoji o clau d'icona
  stockType: StockType;
  quantityType: QuantityType;
  usualLocationIds: ID[]; // només informatiu — l'estoc NO és per lloc
  foodCategory?: FoodCategory; // només menjar
  expiry?: ExpiryPolicy; // només menjar
  trackDuration?: boolean; // opt-in estimació de durada (aigua, gas, cafè…)
  createdAt: ISOTimestamp;
  updatedAt: ISOTimestamp;
}

// ── receptes ─────────────────────────────────────────────────────────────────
export interface RecipeIngredient {
  objectId: ID;
  quantityPerPerson: number; // es multiplica per N comensals en cuinar
}

export interface Recipe {
  id: ID;
  title: string;
  ingredients: RecipeIngredient[];
  prepTimeMinutes?: number;
  needsCooking?: boolean; // cal foc
  steps?: string[]; // passos enumerats
  createdAt: ISOTimestamp;
  updatedAt: ISOTimestamp;
}

// ── checklists ───────────────────────────────────────────────────────────────
// La PLANTILLA se sincronitza. El PROGRÉS és LOCAL i mai se sincronitza.
export interface ChecklistItem {
  id: ID;
  label: string;
}

export interface ChecklistTemplate {
  id: ID;
  title: string;
  items: ChecklistItem[];
  createdAt: ISOTimestamp;
  updatedAt: ISOTimestamp;
}

export interface ChecklistProgress {
  // store local de Dexie, NO un esdeveniment
  templateId: ID;
  checkedItemIds: ID[];
  updatedAt: ISOTimestamp;
}

// ── inventari derivat (MAI autoritzat; resultat del fold, en cau) ─────────────
export interface ExpiryLot {
  lotId: ID;
  addedAt: ISOTimestamp;
  expiresAt?: ISOTimestamp;
  quantity: number; // restant d'aquest lot
}

export interface InventoryEntry {
  objectId: ID;
  quantity: number; // sempre >= 0
  lots?: ExpiryLot[]; // només menjar amb caducitat; consum FIFO
}
