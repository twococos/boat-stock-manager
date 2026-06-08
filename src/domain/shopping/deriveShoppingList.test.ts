import { describe, it, expect } from 'vitest';
import {
  deriveShoppingList,
  shoppingItems,
  shoppingListBeforeBarrier,
  activeShoppingBarrier,
} from './deriveShoppingList';
import type { AppEvent, OrderKey, ShoppingBarrierEvent } from '@/types/events';

// ── helpers ────────────────────────────────────────────────────────────────────
let seq = 0;
function base(occurredAt: string, deviceId = 'd', userName = 't') {
  return { id: `e${++seq}`, occurredAt, deviceId, userName, seq };
}
function add(
  occurredAt: string,
  objectId: string,
  delta: number,
  userName = 't',
): AppEvent {
  return { ...base(occurredAt, 'd', userName), type: 'shopping_add', objectId, delta };
}
function remove(occurredAt: string, objectId: string, userName = 't'): AppEvent {
  return { ...base(occurredAt, 'd', userName), type: 'shopping_remove', objectId };
}
function bought(
  occurredAt: string,
  objectId: string,
  qty: number,
  userName = 't',
): AppEvent {
  return { ...base(occurredAt, 'd', userName), type: 'shopping_bought', objectId, qty };
}
function barrier(occurredAt: string, cut: OrderKey): ShoppingBarrierEvent {
  return { ...base(occurredAt), type: 'shopping_barrier', cut };
}

describe('deriveShoppingList', () => {
  it('un add apareix com a ítem amb la quantitat i autor', () => {
    const events = [add('2026-01-02T00:00:00Z', 'o1', 2, 'Aimar')];
    const it1 = deriveShoppingList(events).get('o1')!;
    expect(it1.quantity).toBe(2);
    expect(it1.addedBy).toBe('Aimar');
  });

  it('dos add del mateix objecte sumen en una sola entrada', () => {
    const events = [
      add('2026-01-02T00:00:00Z', 'o1', 1),
      add('2026-01-03T00:00:00Z', 'o1', 2),
    ];
    const map = deriveShoppingList(events);
    expect(map.size).toBe(1);
    expect(map.get('o1')!.quantity).toBe(3);
  });

  it('un delta negatiu resta i a ≤ 0 l\'ítem desapareix', () => {
    const events = [
      add('2026-01-02T00:00:00Z', 'o1', 2),
      add('2026-01-03T00:00:00Z', 'o1', -2),
    ];
    expect(deriveShoppingList(events).has('o1')).toBe(false);
  });

  it('la quantitat se satura a 0 per pas amb events desordenats', () => {
    // +1, −3 (→0), +1 → la fold per pas dóna 1 (el dèficit NO s'arrossega).
    const events = [
      add('2026-01-02T00:00:00Z', 'o1', 1),
      add('2026-01-03T00:00:00Z', 'o1', -3),
      add('2026-01-04T00:00:00Z', 'o1', 1),
    ];
    expect(deriveShoppingList(events).get('o1')!.quantity).toBe(1);
  });

  it('remove treu l\'objecte i un add posterior el recrea net', () => {
    const events = [
      add('2026-01-02T00:00:00Z', 'o1', 3),
      remove('2026-01-03T00:00:00Z', 'o1'),
      add('2026-01-04T00:00:00Z', 'o1', 1),
    ];
    expect(deriveShoppingList(events).get('o1')!.quantity).toBe(1);
  });

  it('bought treu l\'objecte de la llista', () => {
    const events = [
      add('2026-01-02T00:00:00Z', 'o1', 2),
      bought('2026-01-03T00:00:00Z', 'o1', 2),
    ];
    expect(deriveShoppingList(events).has('o1')).toBe(false);
  });

  it('la barrera de buidat ignora els events anteriors al tall i manté els posteriors', () => {
    const cut: OrderKey = { occurredAt: '2026-02-01T00:00:00Z', deviceId: 'd', seq: 999 };
    const events = [
      add('2026-01-02T00:00:00Z', 'o1', 2), // abans → ignorat
      barrier('2026-02-01T00:00:00Z', cut),
      add('2026-02-02T00:00:00Z', 'o2', 1), // després → es manté
    ];
    const map = deriveShoppingList(events);
    expect(map.has('o1')).toBe(false);
    expect(map.get('o2')!.quantity).toBe(1);
  });

  it('shoppingItems ordena per addedAt descendent', () => {
    const events = [
      add('2026-01-02T00:00:00Z', 'o1', 1),
      add('2026-01-04T00:00:00Z', 'o2', 1),
      add('2026-01-03T00:00:00Z', 'o3', 1),
    ];
    const order = shoppingItems(deriveShoppingList(events)).map((i) => i.objectId);
    expect(order).toEqual(['o2', 'o3', 'o1']);
  });

  it('és determinista sota reordenament dels events d\'entrada', () => {
    const e1 = add('2026-01-02T00:00:00Z', 'o1', 1);
    const e2 = add('2026-01-03T00:00:00Z', 'o1', 2);
    const e3 = add('2026-01-04T00:00:00Z', 'o2', 5);
    const a = deriveShoppingList([e1, e2, e3]);
    const b = deriveShoppingList([e3, e1, e2]);
    expect([...a.entries()].map(([k, v]) => [k, v.quantity])).toEqual(
      [...b.entries()].map(([k, v]) => [k, v.quantity]),
    );
  });

  it('shoppingListBeforeBarrier retorna l\'estat just abans del tall', () => {
    const cut: OrderKey = { occurredAt: '2026-02-01T00:00:00Z', deviceId: 'd', seq: 999 };
    const b = barrier('2026-02-01T00:00:00Z', cut);
    const events = [
      add('2026-01-02T00:00:00Z', 'o1', 2),
      add('2026-01-03T00:00:00Z', 'o2', 4),
      b,
      add('2026-02-02T00:00:00Z', 'o3', 1), // posterior → no compta
    ];
    const before = shoppingListBeforeBarrier(events, b);
    expect(before.get('o1')!.quantity).toBe(2);
    expect(before.get('o2')!.quantity).toBe(4);
    expect(before.has('o3')).toBe(false);
  });

  it('activeShoppingBarrier retorna l\'última barrera per ordre', () => {
    const cut1: OrderKey = { occurredAt: '2026-02-01T00:00:00Z', deviceId: 'd', seq: 1 };
    const cut2: OrderKey = { occurredAt: '2026-03-01T00:00:00Z', deviceId: 'd', seq: 2 };
    const events = [barrier('2026-02-01T00:00:00Z', cut1), barrier('2026-03-01T00:00:00Z', cut2)];
    expect(activeShoppingBarrier(events)!.cut).toEqual(cut2);
  });
});
