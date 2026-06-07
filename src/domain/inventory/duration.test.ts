import { describe, it, expect } from 'vitest';
import { estimateWaterDuration } from './duration';
import type { ItemObject } from '@/types/entities';
import type { AppEvent, StockDeltaLine } from '@/types/events';

/**
 * Estimació AGREGADA de l'aigua potable (per litres).
 *
 * Tots els objectes d'aigua compten com un sol recurs: el que importa són els litres
 * totals i el ritme de litres gastats, no quines ampolles concretes queden.
 */

function water(id: string, capacityLiters: number): ItemObject {
  return {
    id,
    name: id,
    stockType: 'food',
    quantityType: 'units',
    usualLocationIds: [],
    foodCategory: 'water',
    capacityLiters,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };
}

function consume(objectId: string, bottles: number, occurredAt: string): AppEvent {
  const line: StockDeltaLine = { objectId, delta: -bottles };
  return {
    id: `${objectId}-${occurredAt}`,
    type: 'stock_delta',
    reason: 'cooking',
    occurredAt,
    deviceId: 'd',
    userName: 't',
    seq: 1,
    lines: [line],
  };
}

describe('estimateWaterDuration (aigua agregada per litres)', () => {
  const now = '2026-01-10T00:00:00Z';

  it('suma litres de diferents capacitats i estima la durada pel ritme', () => {
    // Estoc: 2 ampolles de 8 L + 3 de 5 L = 16 + 15 = 31 L.
    const objs = [water('big', 8), water('small', 5)];
    const stock = new Map([
      ['big', 2],
      ['small', 3],
    ]);
    // Consum dins la finestra de 3 dies: 1 ampolla de 8 L + 2 de 5 L = 18 L → 6 L/dia.
    const events = [
      consume('big', 1, '2026-01-08T00:00:00Z'),
      consume('small', 2, '2026-01-09T00:00:00Z'),
    ];

    const est = estimateWaterDuration(objs, stock, events, 3, now);
    expect(est.litersInStock).toBe(31);
    expect(est.ratePerDay).toBe(6); // 18 L / 3 dies
    expect(est.daysRemaining).toBeCloseTo(31 / 6, 5);
  });

  it('sense consum a la finestra → durada indefinida (null)', () => {
    const objs = [water('big', 8)];
    const stock = new Map([['big', 4]]);
    const est = estimateWaterDuration(objs, stock, [], 3, now);
    expect(est.litersInStock).toBe(32);
    expect(est.daysRemaining).toBeNull();
  });

  it('ignora el consum fora de la finestra temporal', () => {
    const objs = [water('big', 8)];
    const stock = new Map([['big', 4]]);
    // Consum de fa 20 dies: fora de la finestra de 3 dies.
    const events = [consume('big', 1, '2025-12-21T00:00:00Z')];
    const est = estimateWaterDuration(objs, stock, events, 3, now);
    expect(est.daysRemaining).toBeNull();
  });
});
