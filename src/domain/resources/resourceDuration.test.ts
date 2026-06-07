import { describe, it, expect } from 'vitest';
import { estimateResourceDuration } from './resourceDuration';
import type { ResourceConfig } from '@/types/entities';
import type { AppEvent } from '@/types/events';

let seq = 0;
function base(occurredAt: string) {
  return { id: `e${++seq}`, occurredAt, deviceId: 'd', userName: 't', seq };
}
const fuelCfg: ResourceConfig = {
  kind: 'fuel',
  fuel: { capacityLiters: 200 },
  updatedAt: '2026-01-01T00:00:00Z',
};

describe('estimateResourceDuration', () => {
  const now = '2026-01-10T00:00:00Z';

  it('gasoil: ritme del consum dins la finestra → dies restants', () => {
    // 100% (200 L) → 70% (140 L) tres dies enrere = 60 L en 3 dies → 20 L/dia.
    const events: AppEvent[] = [
      { ...base('2026-01-07T00:00:00Z'), type: 'fuel_measure', percent: 100 },
      { ...base('2026-01-09T00:00:00Z'), type: 'fuel_measure', percent: 70 },
    ];
    const est = estimateResourceDuration('fuel', events, fuelCfg, 140, 3, now);
    expect(est.ratePerDay).toBeCloseTo(20, 5); // 60 L / 3 dies
    expect(est.daysRemaining).toBeCloseTo(7, 5); // 140 / 20
  });

  it('sense prou mesures dins la finestra → daysRemaining null', () => {
    const events: AppEvent[] = [{ ...base('2026-01-09T00:00:00Z'), type: 'fuel_measure', percent: 70 }];
    const est = estimateResourceDuration('fuel', events, fuelCfg, 140, 3, now);
    expect(est.daysRemaining).toBeNull();
  });

  it('omplir no compta com a consum', () => {
    const events: AppEvent[] = [
      { ...base('2026-01-08T00:00:00Z'), type: 'fuel_measure', percent: 50 }, // 100 L
      { ...base('2026-01-09T00:00:00Z'), type: 'fuel_measure', refillToFull: true }, // puja → no consum
    ];
    const est = estimateResourceDuration('fuel', events, fuelCfg, 200, 3, now);
    expect(est.daysRemaining).toBeNull();
  });

  it('aigua: consum = diferència de comptador', () => {
    const events: AppEvent[] = [
      { ...base('2026-01-08T00:00:00Z'), type: 'water_measure', counter: 1000, activeTank: 'proa' },
      { ...base('2026-01-09T00:00:00Z'), type: 'water_measure', counter: 1090, activeTank: 'proa' },
    ];
    // 90 L en 3 dies de finestra → 30 L/dia; restant 210 L → 7 dies.
    const est = estimateResourceDuration('water', events, undefined, 210, 3, now);
    expect(est.ratePerDay).toBeCloseTo(30, 5);
    expect(est.daysRemaining).toBeCloseTo(7, 5);
  });
});
