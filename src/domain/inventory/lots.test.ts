import { describe, it, expect } from 'vitest';
import { deriveInventory } from './derive';
import type { AppEvent, StockDeltaLine } from '@/types/events';
import type { ID, ItemObject } from '@/types/entities';

function foodWithExpiry(id: string): ItemObject {
  return {
    id,
    name: id,
    stockType: 'food',
    quantityType: 'units',
    usualLocationIds: [],
    expiry: { mode: 'define_on_add' },
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };
}

let c = 0;
function ev(occurredAt: string, lines: StockDeltaLine[]): AppEvent {
  return {
    id: `l-${++c}`,
    type: 'stock_delta',
    reason: 'purchase',
    occurredAt,
    deviceId: 'd',
    userName: 't',
    seq: c,
    lines,
  };
}

describe('lots de caducitat FIFO', () => {
  const objects = new Map<ID, ItemObject>([['yog', foodWithExpiry('yog')]]);

  it('consumeix primer el lot que caduca abans', () => {
    const events: AppEvent[] = [
      // lot que caduca aviat
      ev('2026-01-01T00:00:00Z', [
        { objectId: 'yog', delta: +2, expiresAt: '2026-01-10T00:00:00Z' },
      ]),
      // lot que caduca més tard
      ev('2026-01-02T00:00:00Z', [
        { objectId: 'yog', delta: +3, expiresAt: '2026-02-01T00:00:00Z' },
      ]),
      // consum de 2 → ha de buidar el primer lot (el que caduca abans)
      ev('2026-01-03T00:00:00Z', [{ objectId: 'yog', delta: -2 }]),
    ];
    const inv = deriveInventory(events, objects);
    const entry = inv.get('yog')!;
    expect(entry.quantity).toBe(3);
    expect(entry.lots).toHaveLength(1);
    expect(entry.lots![0]!.expiresAt).toBe('2026-02-01T00:00:00Z');
    expect(entry.lots![0]!.quantity).toBe(3);
  });

  it('la suma de lots quadra amb la quantitat total', () => {
    const events: AppEvent[] = [
      ev('2026-01-01T00:00:00Z', [
        { objectId: 'yog', delta: +4, expiresAt: '2026-01-20T00:00:00Z' },
      ]),
      ev('2026-01-02T00:00:00Z', [{ objectId: 'yog', delta: -1 }]),
    ];
    const inv = deriveInventory(events, objects);
    const entry = inv.get('yog')!;
    const sum = entry.lots!.reduce((s, l) => s + l.quantity, 0);
    expect(sum).toBe(entry.quantity);
    expect(entry.quantity).toBe(3);
  });

  it('consum superior al total satura a 0 (cap lot)', () => {
    const events: AppEvent[] = [
      ev('2026-01-01T00:00:00Z', [
        { objectId: 'yog', delta: +2, expiresAt: '2026-01-20T00:00:00Z' },
      ]),
      ev('2026-01-02T00:00:00Z', [{ objectId: 'yog', delta: -5 }]),
    ];
    const inv = deriveInventory(events, objects);
    const entry = inv.get('yog')!;
    expect(entry.quantity).toBe(0);
    expect(entry.lots).toHaveLength(0);
  });

  it('days_from_purchase calcula la caducitat des de la data d\'addició', () => {
    const objs = new Map<ID, ItemObject>([
      [
        'can',
        {
          ...foodWithExpiry('can'),
          expiry: { mode: 'days_from_purchase', days: 10 },
        },
      ],
    ]);
    const events: AppEvent[] = [
      ev('2026-01-01T00:00:00Z', [{ objectId: 'can', delta: +1 }]),
    ];
    const inv = deriveInventory(events, objs);
    const lot = inv.get('can')!.lots![0]!;
    expect(lot.expiresAt).toBe('2026-01-11T00:00:00.000Z');
  });
});
