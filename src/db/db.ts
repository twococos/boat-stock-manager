import Dexie, { type Table } from 'dexie';
import type {
  ItemObject,
  StowageLocation,
  Recipe,
  ChecklistTemplate,
  ChecklistProgress,
  InventoryEntry,
} from '@/types/entities';
import type { AppEvent } from '@/types/events';

/** Estat de sincronització d'una fila d'esdeveniment local. */
export type Pending = 0 | 1;

/** Fila d'esdeveniment a Dexie: l'AppEvent + metadades locals de sync. */
export type LocalEvent = AppEvent & {
  _pending: Pending; // 1 = encara no confirmat pel servidor
  _serverSeq?: number; // ordre global assignat pel servidor (un cop sincronitzat)
};

/** Foto pendent de pujar (feta offline). */
export interface PendingPhoto {
  id: string;
  blob: Blob;
  targetType: 'object' | 'location';
  targetId: string;
  createdAt: string;
}

/** Metadades de sincronització (una sola fila amb key 'sync'). */
export interface SyncMeta {
  key: string; // 'sync'
  lastServerSeq: number; // marca d'aigua de l'últim esdeveniment baixat
  lastSyncedAt?: string;
  deviceId: string;
  localSeq: number; // comptador monòton per dispositiu
}

/**
 * Base de dades local (IndexedDB via Dexie).
 *
 * `events` és la còpia local del log append-only I la cua de pendents (`_pending=1`).
 * `inventory` i les taules de definició són CAUS derivades del log (es reescriuen a
 * cada recompute) — mai són font de veritat. `checklistProgress` és l'únic store
 * realment local i mai sincronitzat. Veure PLA.md (secció 7).
 */
export class BoatDB extends Dexie {
  events!: Table<LocalEvent, string>;
  objects!: Table<ItemObject, string>;
  locations!: Table<StowageLocation, string>;
  recipes!: Table<Recipe, string>;
  checklistTemplates!: Table<ChecklistTemplate, string>;
  checklistProgress!: Table<ChecklistProgress, string>; // LOCAL ONLY
  inventory!: Table<InventoryEntry, string>; // CAU derivada
  pendingPhotos!: Table<PendingPhoto, string>;
  meta!: Table<SyncMeta, string>;

  constructor() {
    super('boat-stock-manager');
    this.version(1).stores({
      events:
        'id, _pending, _serverSeq, occurredAt, [occurredAt+deviceId+seq], type',
      objects: 'id, stockType, foodCategory, name',
      locations: 'id, parentId, name',
      recipes: 'id, title',
      checklistTemplates: 'id, title',
      checklistProgress: 'templateId',
      inventory: 'objectId',
      pendingPhotos: 'id',
      meta: 'key',
    });
  }
}

export const db = new BoatDB();
