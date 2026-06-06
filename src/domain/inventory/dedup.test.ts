import { describe, it, expect } from 'vitest';
import { deriveInventory } from './derive';
import type { AppEvent, StockDeltaLine } from '@/types/events';

/**
 * Dedup / idempotència: el log no ha de comptar dos cops el mateix esdeveniment.
 *
 * A la BD, la dedup la garanteix la clau única `id` (UUID v7) + `on conflict do nothing`
 * a la RPC, i `bulkPut` (upsert per clau primària) a Dexie. Aquí verifiquem que, encara
 * que un esdeveniment aparegui repetit a la llista, el fold l'ha de tractar com un de
 * sol si abans s'ha deduplicat per id (com fa la capa de persistència).
 */
function dedupById(events: AppEvent[]): AppEvent[] {
  const byId = new Map<string, AppEvent>();
  for (const e of events) byId.set(e.id, e);
  return [...byId.values()];
}

const line = (objectId: string, delta: number): StockDeltaLine => ({ objectId, delta });

function ev(id: string, occurredAt: string, lines: StockDeltaLine[]): AppEvent {
  return {
    id,
    type: 'stock_delta',
    reason: 'purchase',
    occurredAt,
    deviceId: 'd',
    userName: 't',
    seq: 1,
    lines,
  };
}

describe('dedup per id (idempotència del sync)', () => {
  it('empènyer/baixar el mateix esdeveniment dues vegades no el compta dos cops', () => {
    const e1 = ev('same-id', '2026-01-01T00:00:00Z', [line('water', +10)]);
    const duplicated = [e1, { ...e1 }]; // mateix id, simulant doble arribada

    const deduped = dedupById(duplicated);
    expect(deduped).toHaveLength(1);
    expect(deriveInventory(deduped).get('water')?.quantity).toBe(10);
  });

  it('esdeveniments amb ids diferents sí que se sumen', () => {
    const events = [
      ev('a', '2026-01-01T00:00:00Z', [line('water', +10)]),
      ev('b', '2026-01-01T01:00:00Z', [line('water', +5)]),
    ];
    expect(deriveInventory(dedupById(events)).get('water')?.quantity).toBe(15);
  });
});
