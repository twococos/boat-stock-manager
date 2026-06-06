import type { FoodCategory, ItemObject } from '@/types/entities';

/** Categories agrupades per a cada opció del menú de cuinar. */
export const COOK_CATEGORIES: Record<string, FoodCategory[]> = {
  water: ['water'],
  snacks: ['snacks'],
  dessert: ['dessert', 'fruit'],
  breakfast: ['breakfast'],
};

/** Filtra objectes de menjar/consumibles que pertanyen a unes categories donades. */
export function filterByCategories(
  objects: ItemObject[],
  categories: FoodCategory[],
): ItemObject[] {
  const set = new Set(categories);
  return objects.filter(
    (o) =>
      (o.stockType === 'food' || o.stockType === 'consumable') &&
      o.foodCategory !== undefined &&
      set.has(o.foodCategory),
  );
}
