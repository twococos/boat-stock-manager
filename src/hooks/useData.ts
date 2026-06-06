import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import type { ID, InventoryEntry, ItemObject } from '@/types/entities';

/**
 * Hooks de lectura reactius sobre les caus de Dexie.
 *
 * `useLiveQuery` re-renderitza automàticament quan canvien les dades subjacents (p.ex.
 * després d'un recompute). És tot el "gestor d'estat" que cal per a la dada persistent.
 * Veure PLA.md (secció 11).
 */

export const useObjects = () => useLiveQuery(() => db.objects.toArray(), [], []);
export const useLocations = () => useLiveQuery(() => db.locations.toArray(), [], []);
export const useRecipes = () => useLiveQuery(() => db.recipes.toArray(), [], []);
export const useChecklists = () =>
  useLiveQuery(() => db.checklistTemplates.toArray(), [], []);
export const useInventory = () => useLiveQuery(() => db.inventory.toArray(), [], []);
export const useAllEvents = () => useLiveQuery(() => db.events.toArray(), [], []);

/** Mapa objectId → ItemObject, reactiu. */
export function useObjectsMap(): Map<ID, ItemObject> {
  const objects = useObjects();
  return new Map((objects ?? []).map((o) => [o.id, o]));
}

/** Mapa objectId → InventoryEntry, reactiu. */
export function useInventoryMap(): Map<ID, InventoryEntry> {
  const inv = useInventory();
  return new Map((inv ?? []).map((e) => [e.objectId, e]));
}

/** Quantitat actual d'un objecte (0 si no existeix), reactiu. */
export function useQuantity(objectId: ID): number {
  const entry = useLiveQuery(() => db.inventory.get(objectId), [objectId]);
  return entry?.quantity ?? 0;
}
