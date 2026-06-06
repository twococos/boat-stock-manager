import type {
  ID,
  ItemObject,
  StowageLocation,
  Recipe,
  ChecklistTemplate,
} from '@/types/entities';
import type { AppEvent } from '@/types/events';
import { sortEvents } from './ordering';

/**
 * Deriva les taules de definició (objectes, llocs, receptes, plantilles de checklist)
 * reproduint els esdeveniments `*_upsert` en ordre cronològic.
 *
 * Estratègia: last-writer-wins. Com que els esdeveniments es processen en l'ordre
 * determinista de {@link sortEvents}, l'últim upsert d'una entitat guanya, de forma
 * idèntica a tots els dispositius. Veure PLA.md (secció 3.3).
 */
export interface DerivedDefinitions {
  objects: Map<ID, ItemObject>;
  locations: Map<ID, StowageLocation>;
  recipes: Map<ID, Recipe>;
  checklistTemplates: Map<ID, ChecklistTemplate>;
}

export function deriveDefinitions(events: readonly AppEvent[]): DerivedDefinitions {
  const objects = new Map<ID, ItemObject>();
  const locations = new Map<ID, StowageLocation>();
  const recipes = new Map<ID, Recipe>();
  const checklistTemplates = new Map<ID, ChecklistTemplate>();

  for (const ev of sortEvents(events)) {
    switch (ev.type) {
      case 'object_upsert':
        objects.set(ev.payload.id, ev.payload);
        break;
      case 'location_upsert':
        locations.set(ev.payload.id, ev.payload);
        break;
      case 'recipe_upsert':
        recipes.set(ev.payload.id, ev.payload);
        break;
      case 'checklist_upsert':
        checklistTemplates.set(ev.payload.id, ev.payload);
        break;
      // 'stock_delta' no afecta les definicions.
    }
  }

  return { objects, locations, recipes, checklistTemplates };
}
