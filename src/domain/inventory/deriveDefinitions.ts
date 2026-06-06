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
 * reproduint els esdeveniments `*_upsert` / `*_delete` en ordre cronològic.
 *
 * Estratègia: last-writer-wins. Com que els esdeveniments es processen en l'ordre
 * determinista de {@link sortEvents}, l'últim upsert/delete d'una entitat guanya, de
 * forma idèntica a tots els dispositius. Un `*_delete` posterior a un upsert treu
 * l'entitat; un re-upsert posterior la torna a crear. Veure PLA.md (secció 3.3).
 *
 * Després del fold es fa una passada de neteja de referències òrfenes (cascada pura,
 * sense generar esdeveniments): si s'elimina un objecte, desapareix dels ingredients de
 * totes les receptes; si s'elimina un lloc, desapareix dels `usualLocationIds` dels
 * objectes.
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
      case 'object_delete':
        objects.delete(ev.targetId);
        break;
      case 'location_delete':
        locations.delete(ev.targetId);
        break;
      case 'recipe_delete':
        recipes.delete(ev.targetId);
        break;
      case 'checklist_delete':
        checklistTemplates.delete(ev.targetId);
        break;
      // 'stock_delta' no afecta les definicions.
    }
  }

  // ── Cascada: netejar referències a entitats ja eliminades ──────────────────
  // Objecte eliminat → fora dels ingredients de les receptes.
  for (const [id, recipe] of recipes) {
    const cleaned = recipe.ingredients.filter((ing) => objects.has(ing.objectId));
    if (cleaned.length !== recipe.ingredients.length) {
      recipes.set(id, { ...recipe, ingredients: cleaned });
    }
  }

  // Lloc eliminat → fora dels usualLocationIds dels objectes.
  for (const [id, obj] of objects) {
    const cleaned = obj.usualLocationIds.filter((locId) => locations.has(locId));
    if (cleaned.length !== obj.usualLocationIds.length) {
      objects.set(id, { ...obj, usualLocationIds: cleaned });
    }
  }

  return { objects, locations, recipes, checklistTemplates };
}
