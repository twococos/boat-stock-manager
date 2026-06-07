import { describe, it, expect } from 'vitest';
import { compareEvents, compareKey, keyOf, sortEvents } from './ordering';
import type { AppEvent } from '@/types/events';

function ev(id: string, occurredAt: string, deviceId: string, seq: number): AppEvent {
  return {
    id,
    type: 'stock_delta',
    reason: 'adjustment',
    occurredAt,
    deviceId,
    userName: 't',
    seq,
    lines: [],
  };
}

describe('compareEvents — ordre determinista (occurredAt, deviceId, seq)', () => {
  it('ordena primer per occurredAt', () => {
    const a = ev('a', '2026-01-01T00:00:00Z', 'd', 1);
    const b = ev('b', '2026-01-02T00:00:00Z', 'd', 1);
    expect(compareEvents(a, b)).toBeLessThan(0);
  });

  it('desempata per deviceId quan occurredAt és igual', () => {
    const a = ev('a', '2026-01-01T00:00:00Z', 'A', 5);
    const b = ev('b', '2026-01-01T00:00:00Z', 'B', 1);
    expect(compareEvents(a, b)).toBeLessThan(0); // 'A' < 'B'
  });

  it('desempata per seq quan occurredAt i deviceId són iguals', () => {
    const a = ev('a', '2026-01-01T00:00:00Z', 'A', 1);
    const b = ev('b', '2026-01-01T00:00:00Z', 'A', 2);
    expect(compareEvents(a, b)).toBeLessThan(0);
  });

  it('sortEvents no muta l\'array original', () => {
    const arr = [
      ev('a', '2026-01-03T00:00:00Z', 'd', 3),
      ev('b', '2026-01-01T00:00:00Z', 'd', 1),
    ];
    const sorted = sortEvents(arr);
    expect(sorted[0]!.id).toBe('b');
    expect(arr[0]!.id).toBe('a'); // original intacte
  });

  it('compareKey té el mateix signe que compareEvents (paritat — crític per a les barreres)', () => {
    const samples = [
      ev('1', '2026-01-01T00:00:00Z', 'A', 1),
      ev('2', '2026-01-01T00:00:00Z', 'A', 2),
      ev('3', '2026-01-01T00:00:00Z', 'B', 1),
      ev('4', '2026-01-02T00:00:00Z', 'A', 1),
    ];
    for (const a of samples) {
      for (const b of samples) {
        expect(Math.sign(compareKey(keyOf(a), keyOf(b)))).toBe(
          Math.sign(compareEvents(a, b)),
        );
      }
    }
  });
});
