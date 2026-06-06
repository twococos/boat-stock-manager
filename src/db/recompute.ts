import { db } from './db';
import { getAllEvents } from './repositories/events.repo';
import { deriveInventory } from '@/domain/inventory/derive';
import { deriveDefinitions } from '@/domain/inventory/deriveDefinitions';

/**
 * Recalcula tot l'estat derivat a partir del log d'esdeveniments i el desa a les caus
 * de Dexie (inventory + taules de definició).
 *
 * Estratègia: recompute-from-scratch (PLA.md secció 3.4). Amb el volum d'aquest
 * projecte (centenars/pocs milers d'esdeveniments) és submil·lisegon i fa que els
 * esdeveniments tardans i el reordenament siguin trivialment correctes.
 *
 * S'invoca: després de cada escriptura local d'esdeveniment i després de cada pull de
 * sincronització.
 */
export async function recomputeAll(): Promise<void> {
  const events = await getAllEvents();

  // 1) Derivar definicions primer (l'inventari les necessita per a la caducitat).
  const defs = deriveDefinitions(events);

  // 2) Derivar inventari amb les definicions d'objecte (per a la política de lots).
  const inventory = deriveInventory(events, defs.objects);

  await db.transaction(
    'rw',
    [db.objects, db.locations, db.recipes, db.checklistTemplates, db.inventory],
    async () => {
      // Reemplaçar completament les caus (recompute-from-scratch).
      await Promise.all([
        db.objects.clear(),
        db.locations.clear(),
        db.recipes.clear(),
        db.checklistTemplates.clear(),
        db.inventory.clear(),
      ]);

      await Promise.all([
        db.objects.bulkPut([...defs.objects.values()]),
        db.locations.bulkPut([...defs.locations.values()]),
        db.recipes.bulkPut([...defs.recipes.values()]),
        db.checklistTemplates.bulkPut([...defs.checklistTemplates.values()]),
        db.inventory.bulkPut([...inventory.values()]),
      ]);
    },
  );
}
