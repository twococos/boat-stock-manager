import { describe, it, expect } from 'vitest';
import { scaleIngredientQuantity, scaleRecipe, recipeToCookLines } from './scaling';
import type { ID, ItemObject, Recipe } from '@/types/entities';

function obj(id: string, quantityType: ItemObject['quantityType']): ItemObject {
  return {
    id,
    name: id,
    stockType: 'food',
    quantityType,
    usualLocationIds: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };
}

describe('escalat de quantitats', () => {
  it('units: arrodoneix AMUNT (2,5 → 3)', () => {
    expect(scaleIngredientQuantity(1.25, 2, 'units')).toBe(3); // 2,5 → 3
    expect(scaleIngredientQuantity(1, 6, 'units')).toBe(6);
    expect(scaleIngredientQuantity(0.5, 1, 'units')).toBe(1); // 0,5 → 1
  });

  it('kg / L: decimals exactes', () => {
    expect(scaleIngredientQuantity(0.15, 3, 'kg')).toBeCloseTo(0.45);
    expect(scaleIngredientQuantity(0.33, 2, 'L')).toBeCloseTo(0.66);
  });
});

describe('escalat de receptes', () => {
  const objects = new Map<ID, ItemObject>([
    ['egg', obj('egg', 'units')],
    ['oil', obj('oil', 'L')],
  ]);
  const recipe: Recipe = {
    id: 'r1',
    title: 'Truita',
    ingredients: [
      { objectId: 'egg', quantityPerPerson: 1.25 },
      { objectId: 'oil', quantityPerPerson: 0.02 },
    ],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  it('escala cada ingredient segons el seu tipus', () => {
    const scaled = scaleRecipe(recipe, 2, objects);
    expect(scaled.find((s) => s.objectId === 'egg')!.quantity).toBe(3); // ceil(2,5)
    expect(scaled.find((s) => s.objectId === 'oil')!.quantity).toBeCloseTo(0.04);
  });

  it('recipeToCookLines genera deltes negatius', () => {
    const lines = recipeToCookLines(recipe, 2, objects);
    expect(lines.find((l) => l.objectId === 'egg')!.delta).toBe(-3);
    expect(lines.find((l) => l.objectId === 'oil')!.delta).toBeCloseTo(-0.04);
  });
});
