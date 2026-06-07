import { describe, it, expect } from 'vitest';
import { deriveInventory, deriveQuantity } from './derive';
import type {
  AppEvent,
  StockDeltaLine,
  StockBarrierEvent,
  StockBarrierMode,
  OrderKey,
} from '@/types/events';

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

function barrier(
  deviceId: string,
  seq: number,
  occurredAt: string,
  mode: StockBarrierMode,
  cut: OrderKey,
): StockBarrierEvent {
  return {
    id: `bar-${++counter}`,
    type: 'stock_barrier',
    occurredAt,
    deviceId,
    userName: 'test',
    seq,
    mode,
    cut,
  };
}
const keyOf = (e: AppEvent): OrderKey => ({
  occurredAt: e.occurredAt,
  deviceId: e.deviceId,
  seq: e.seq,
});

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

describe('deriveInventory — barreres de tall (rewind / reset)', () => {
  const t = (s: string) => `2026-01-01T0${s}:00Z`;

  it('rewind conserva l\'event diana i ignora els posteriors', () => {
    const e1 = ev('d', 1, t('0'), [line('egg', +5)]);
    const e2 = ev('d', 2, t('1'), [line('egg', -2)]); // diana → estat 3
    const e3 = ev('d', 3, t('2'), [line('egg', -1)]); // posterior → ignorat
    const bar = barrier('d', 4, t('3'), 'rewind', keyOf(e2));
    expect(deriveQuantity('egg', [e1, e2, e3, bar])).toBe(3);
  });

  it('reset ignora tot el passat → inventari buit/0', () => {
    const e1 = ev('d', 1, t('0'), [line('egg', +5)]);
    const e2 = ev('d', 2, t('1'), [line('flour', +3)]);
    const bar = barrier('d', 3, t('2'), 'reset', keyOf({ ...e2, occurredAt: t('2'), seq: 3 } as AppEvent));
    const inv = deriveInventory([e1, e2, bar]);
    expect(inv.get('egg')?.quantity ?? 0).toBe(0);
    expect(inv.get('flour')?.quantity ?? 0).toBe(0);
  });

  it('reset conserva els deltes POSTERIORS al reset', () => {
    const e1 = ev('d', 1, t('0'), [line('egg', +5)]);
    const resetKey: OrderKey = { occurredAt: t('1'), deviceId: 'd', seq: 2 };
    const bar = barrier('d', 2, t('1'), 'reset', resetKey);
    const e2 = ev('d', 3, t('2'), [line('egg', +2)]); // després del reset → compta
    expect(deriveQuantity('egg', [e1, bar, e2])).toBe(2);
  });

  it('val L\'ÚLTIMA barrera emesa (des-rebobinar)', () => {
    const e1 = ev('d', 1, t('0'), [line('egg', +5)]);
    const e2 = ev('d', 2, t('1'), [line('egg', -2)]); // estat 3
    const e3 = ev('d', 3, t('2'), [line('egg', +4)]); // estat 7
    const rw1 = barrier('d', 4, t('3'), 'rewind', keyOf(e1)); // talla a e1 → 5
    const rw2 = barrier('d', 5, t('4'), 'rewind', keyOf(e3)); // posterior → talla a e3 → 7
    expect(deriveQuantity('egg', [e1, e2, e3, rw1, rw2])).toBe(7);
  });

  it('deltes "ressuscitats" anteriors al reset s\'ignoren (cas offline)', () => {
    // Simula: després d\'un reset, un delta vell (clau anterior) torna al log.
    const resetKey: OrderKey = { occurredAt: t('5'), deviceId: 'd', seq: 1 };
    const bar = barrier('d', 1, t('5'), 'reset', resetKey);
    const old = ev('z', 9, t('0'), [line('egg', +99)]); // clau anterior al reset
    expect(deriveQuantity('egg', [bar, old])).toBe(0);
  });

  it('reset amb objecte amb caducitat → lots buits', () => {
    const obj = new Map([
      [
        'milk',
        {
          id: 'milk',
          name: 'Llet',
          stockType: 'food' as const,
          quantityType: 'units' as const,
          usualLocationIds: [],
          expiry: { mode: 'define_on_add' as const },
          createdAt: t('0'),
          updatedAt: t('0'),
        },
      ],
    ]);
    const e1: AppEvent = {
      ...ev('d', 1, t('0'), [{ objectId: 'milk', delta: +3, expiresAt: t('9') }]),
    };
    const resetKey: OrderKey = { occurredAt: t('1'), deviceId: 'd', seq: 2 };
    const bar = barrier('d', 2, t('1'), 'reset', resetKey);
    const inv = deriveInventory([e1, bar], obj);
    expect(inv.get('milk')?.quantity ?? 0).toBe(0);
    expect(inv.get('milk')?.lots ?? []).toEqual([]);
  });
});
