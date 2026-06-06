import { describe, it, expect } from 'vitest';
import { deriveInventory, deriveQuantity } from './derive';
import type { AppEvent, StockDeltaLine } from '@/types/events';

// ── helpers de construcció d'esdeveniments per a tests ───────────────────────
let counter = 0;
function ev(
  deviceId: string,
  seq: number,
  occurredAt: string,
  lines: StockDeltaLine[],
): AppEvent {
  return {
    id: `ev-${++counter}`,
    type: 'stock_delta',
    reason: 'adjustment',
    occurredAt,
    deviceId,
    userName: 'test',
    seq,
    lines,
  };
}
const line = (objectId: string, delta: number): StockDeltaLine => ({ objectId, delta });

describe('deriveInventory — regla d\'or (saturació per pas)', () => {
  it('+2, −3, −1, +1 → 1 (NO sumar-i-saturar, que donaria 0)', () => {
    const t = '2026-01-01T00:00:0';
    const events: AppEvent[] = [
      ev('d', 1, `${t}0Z`, [line('egg', +2)]),
      ev('d', 2, `${t}1Z`, [line('egg', -3)]),
      ev('d', 3, `${t}2Z`, [line('egg', -1)]),
      ev('d', 4, `${t}3Z`, [line('egg', +1)]),
    ];
    expect(deriveQuantity('egg', events)).toBe(1);
  });

  it('CAS CANÒNIC DELS OUS: 2 ous; A−3, B−1 (offline paral·lel) → 0; després +1 → 1', () => {
    // Dos dispositius offline. occurredAt determina l'ordre del fold.
    const t0 = '2026-01-01T10:00:00Z'; // +2 inicial
    const tA = '2026-01-01T12:00:00Z'; // A gasta 3
    const tB = '2026-01-01T12:00:05Z'; // B gasta 1
    const tBuy = '2026-01-02T09:00:00Z'; // compra +1 l'endemà

    const events: AppEvent[] = [
      ev('seed', 1, t0, [line('egg', +2)]),
      ev('A', 1, tA, [line('egg', -3)]), // intenta -3 sobre 2 → satura a 0
      ev('B', 1, tB, [line('egg', -1)]), // -1 sobre 0 → roman 0 (no -1!)
      ev('buy', 1, tBuy, [line('egg', +1)]), // +1 sobre 0 → 1 (no arrossega deute)
    ];
    expect(deriveQuantity('egg', events)).toBe(1);
  });

  it('l\'estoc mai és negatiu encara que es consumeixi molt', () => {
    const t = '2026-01-01T00:00:0';
    const events: AppEvent[] = [
      ev('d', 1, `${t}0Z`, [line('x', +1)]),
      ev('d', 2, `${t}1Z`, [line('x', -100)]),
    ];
    expect(deriveQuantity('x', events)).toBe(0);
  });

  it('és determinista independentment de l\'ordre d\'arribada (ordena per occurredAt)', () => {
    const t0 = '2026-01-01T10:00:00Z';
    const tA = '2026-01-01T12:00:00Z';
    const tBuy = '2026-01-02T09:00:00Z';
    const inOrder: AppEvent[] = [
      ev('seed', 1, t0, [line('egg', +2)]),
      ev('A', 1, tA, [line('egg', -3)]),
      ev('buy', 1, tBuy, [line('egg', +1)]),
    ];
    const shuffled = [inOrder[2]!, inOrder[0]!, inOrder[1]!];
    expect(deriveQuantity('egg', shuffled)).toBe(deriveQuantity('egg', inOrder));
    expect(deriveQuantity('egg', shuffled)).toBe(1);
  });
});

describe('deriveInventory — diverses línies i objectes', () => {
  it('un esdeveniment amb múltiples línies afecta múltiples objectes', () => {
    const events: AppEvent[] = [
      ev('d', 1, '2026-01-01T00:00:00Z', [line('a', +5), line('b', +3)]),
      ev('d', 2, '2026-01-01T01:00:00Z', [line('a', -2), line('b', -1)]),
    ];
    const inv = deriveInventory(events);
    expect(inv.get('a')?.quantity).toBe(3);
    expect(inv.get('b')?.quantity).toBe(2);
  });

  it('objecte sense esdeveniments no apareix a l\'inventari', () => {
    const inv = deriveInventory([]);
    expect(inv.get('fantasma')).toBeUndefined();
  });

  it('ignora esdeveniments que no són stock_delta', () => {
    const events: AppEvent[] = [
      {
        id: 'o1',
        type: 'object_upsert',
        occurredAt: '2026-01-01T00:00:00Z',
        deviceId: 'd',
        userName: 'test',
        seq: 1,
        payload: {
          id: 'a',
          name: 'A',
          stockType: 'food',
          quantityType: 'units',
          usualLocationIds: [],
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        },
      },
    ];
    const inv = deriveInventory(events);
    expect(inv.size).toBe(0);
  });
});
