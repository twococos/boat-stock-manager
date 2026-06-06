import { describe, it, expect } from 'vitest';
import { deriveDefinitions } from './deriveDefinitions';
import type {
  ItemObject,
  StowageLocation,
  Recipe,
} from '@/types/entities';
import type { AppEvent } from '@/types/events';

// ── helpers ──────────────────────────────────────────────────────────────────
let counter = 0;
function base(deviceId: string, seq: number, occurredAt: string) {
  return {
    id: `ev-${++counter}`,
    occurredAt,
    deviceId,
    userName: 'test',
    seq,
  };
}

const T = (n: number) => `2024-01-01T00:00:0${n}.000Z`;

const obj = (id: string, usualLocationIds: string[] = []): ItemObject => ({
  id,
  name: id,
  stockType: 'food',
  quantityType: 'units',
  usualLocationIds,
  createdAt: T(0),
  updatedAt: T(0),
});

const loc = (id: string): StowageLocation => ({
  id,
  name: id,
  createdAt: T(0),
  updatedAt: T(0),
});

const recipe = (id: string, objectIds: string[]): Recipe => ({
  id,
  title: id,
  ingredients: objectIds.map((objectId) => ({ objectId, quantityPerPerson: 1 })),
  createdAt: T(0),
  updatedAt: T(0),
});

const upObj = (d: string, s: number, t: string, payload: ItemObject): AppEvent => ({
  ...base(d, s, t),
  type: 'object_upsert',
  payload,
});
const upLoc = (d: string, s: number, t: string, payload: StowageLocation): AppEvent => ({
  ...base(d, s, t),
  type: 'location_upsert',
  payload,
});
const upRec = (d: string, s: number, t: string, payload: Recipe): AppEvent => ({
  ...base(d, s, t),
  type: 'recipe_upsert',
  payload,
});
const del = (
  d: string,
  s: number,
  t: string,
  type: 'object_delete' | 'location_delete' | 'recipe_delete' | 'checklist_delete',
  targetId: string,
): AppEvent => ({ ...base(d, s, t), type, targetId });

describe('deriveDefinitions — deletes', () => {
  it('un delete posterior treu l\'entitat', () => {
    const defs = deriveDefinitions([
      upObj('A', 1, T(1), obj('egg')),
      del('A', 2, T(2), 'object_delete', 'egg'),
    ]);
    expect(defs.objects.has('egg')).toBe(false);
  });

  it('un re-upsert posterior a un delete recrea l\'entitat', () => {
    const defs = deriveDefinitions([
      upObj('A', 1, T(1), obj('egg')),
      del('A', 2, T(2), 'object_delete', 'egg'),
      upObj('A', 3, T(3), obj('egg')),
    ]);
    expect(defs.objects.has('egg')).toBe(true);
  });
});

describe('deriveDefinitions — cascada', () => {
  it('eliminar un objecte el treu dels ingredients de les receptes', () => {
    const defs = deriveDefinitions([
      upObj('A', 1, T(1), obj('egg')),
      upObj('A', 2, T(2), obj('flour')),
      upRec('A', 3, T(3), recipe('cake', ['egg', 'flour'])),
      del('A', 4, T(4), 'object_delete', 'egg'),
    ]);
    const cake = defs.recipes.get('cake');
    expect(cake?.ingredients.map((i) => i.objectId)).toEqual(['flour']);
  });

  it('eliminar un lloc el treu dels usualLocationIds dels objectes', () => {
    const defs = deriveDefinitions([
      upLoc('A', 1, T(1), loc('fridge')),
      upLoc('A', 2, T(2), loc('pantry')),
      upObj('A', 3, T(3), obj('egg', ['fridge', 'pantry'])),
      del('A', 4, T(4), 'location_delete', 'fridge'),
    ]);
    expect(defs.objects.get('egg')?.usualLocationIds).toEqual(['pantry']);
  });

  it('no muta llistes que no tenen referències òrfenes', () => {
    const r = recipe('cake', ['egg']);
    const defs = deriveDefinitions([
      upObj('A', 1, T(1), obj('egg')),
      upRec('A', 2, T(2), r),
    ]);
    // ingredients intactes (un sol ingredient, encara existent)
    expect(defs.recipes.get('cake')?.ingredients).toEqual(r.ingredients);
  });
});
