import { db } from '../db';
import type {
  ID,
  ItemObject,
  StowageLocation,
  Recipe,
  ChecklistTemplate,
  InventoryEntry,
} from '@/types/entities';

/**
 * Repositoris de lectura sobre les caus derivades de Dexie.
 *
 * La UI normalment llegirà via els hooks `useLiveQuery` (Fase posterior); aquestes
 * funcions són per a lectures puntuals fora de React.
 */
export const readObjects = (): Promise<ItemObject[]> => db.objects.toArray();
export const readObject = (id: ID): Promise<ItemObject | undefined> => db.objects.get(id);

export const readLocations = (): Promise<StowageLocation[]> => db.locations.toArray();
export const readLocation = (id: ID): Promise<StowageLocation | undefined> =>
  db.locations.get(id);

export const readRecipes = (): Promise<Recipe[]> => db.recipes.toArray();
export const readRecipe = (id: ID): Promise<Recipe | undefined> => db.recipes.get(id);

export const readChecklists = (): Promise<ChecklistTemplate[]> =>
  db.checklistTemplates.toArray();

export const readInventory = (): Promise<InventoryEntry[]> => db.inventory.toArray();
export const readInventoryEntry = (objectId: ID): Promise<InventoryEntry | undefined> =>
  db.inventory.get(objectId);

/** Construeix un mapa objectId → ItemObject per a càlculs del domini. */
export async function readObjectsMap(): Promise<Map<ID, ItemObject>> {
  const objs = await db.objects.toArray();
  return new Map(objs.map((o) => [o.id, o]));
}
