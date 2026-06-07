import { useMemo } from 'react';
import type { ID, Recipe } from '@/types/entities';
import { useRecipes } from './useData';

/** Receptes que contenen un objecte com a ingredient (reactiu). */
export function useRecipesWithObject(objectId: ID): Recipe[] {
  const recipes = useRecipes();
  return useMemo(
    () => (recipes ?? []).filter((r) => r.ingredients.some((i) => i.objectId === objectId)),
    [recipes, objectId],
  );
}
