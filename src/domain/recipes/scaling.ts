import type { ID, ItemObject, QuantityType, Recipe } from '@/types/entities';
import type { StockDeltaLine } from '@/types/events';

/**
 * Escalat de receptes: ingredients per persona × N comensals, amb arrodoniment.
 *
 * Regles (PLA.md secció 8.4):
 * - Tipus `units` (ous, cebes…): ARRODONIR AMUNT després de multiplicar (2,5 → 3).
 * - Tipus `kg`/`L`: DECIMALS EXACTES.
 * - L'arrodoniment es fa UN SOL LLOC, per ingredient, després de multiplicar. Les
 *   línies resultants ja porten la quantitat final i mai es tornen a arrodonir.
 */

/** Quantitat escalada d'un sol ingredient per a N comensals, ja arrodonida. */
export function scaleIngredientQuantity(
  quantityPerPerson: number,
  diners: number,
  quantityType: QuantityType,
): number {
  const raw = quantityPerPerson * diners;
  if (quantityType === 'units') return Math.ceil(raw);
  return raw; // kg / L: exacte
}

export interface ScaledIngredient {
  objectId: ID;
  quantityType: QuantityType;
  /** Quantitat final per a N comensals (ja arrodonida segons el tipus). */
  quantity: number;
}

/**
 * Escala tots els ingredients d'una recepta per a N comensals.
 *
 * @param recipe Recepta amb ingredients per persona.
 * @param diners Nombre de comensals (>= 1).
 * @param objectsById Definicions d'objecte (per saber el `quantityType`). Si falta un
 *   objecte, es tracta com `units` (arrodoniment amunt) per seguretat.
 */
export function scaleRecipe(
  recipe: Recipe,
  diners: number,
  objectsById: ReadonlyMap<ID, ItemObject>,
): ScaledIngredient[] {
  return recipe.ingredients.map((ing) => {
    const quantityType = objectsById.get(ing.objectId)?.quantityType ?? 'units';
    return {
      objectId: ing.objectId,
      quantityType,
      quantity: scaleIngredientQuantity(ing.quantityPerPerson, diners, quantityType),
    };
  });
}

/**
 * Converteix una recepta escalada en línies de delta de CONSUM (negatives) per a un
 * esdeveniment de cuina.
 */
export function recipeToCookLines(
  recipe: Recipe,
  diners: number,
  objectsById: ReadonlyMap<ID, ItemObject>,
): StockDeltaLine[] {
  return scaleRecipe(recipe, diners, objectsById)
    .filter((ing) => ing.quantity > 0)
    .map((ing) => ({ objectId: ing.objectId, delta: -ing.quantity }));
}

/**
 * Converteix una recepta escalada en línies de delta de COMPRA (positives), per quan
 * s'afegeix una recepta sencera a l'estoc en mode compra.
 */
export function recipeToPurchaseLines(
  recipe: Recipe,
  diners: number,
  objectsById: ReadonlyMap<ID, ItemObject>,
): StockDeltaLine[] {
  return scaleRecipe(recipe, diners, objectsById)
    .filter((ing) => ing.quantity > 0)
    .map((ing) => ({ objectId: ing.objectId, delta: ing.quantity }));
}
