import { describe, it, expect } from 'vitest';
import { deriveResources } from './deriveResources';
import { deriveResourceConfig } from './deriveResourceConfig';
import type { ResourceConfig, ResourceKind } from '@/types/entities';
import type { AppEvent } from '@/types/events';

// ── helpers ────────────────────────────────────────────────────────────────────
let seq = 0;
function base(occurredAt: string) {
  return { id: `e${++seq}`, occurredAt, deviceId: 'd', userName: 't', seq };
}
function configMap(...cfgs: ResourceConfig[]): Map<ResourceKind, ResourceConfig> {
  return new Map(cfgs.map((c) => [c.kind, c]));
}
const fuelCfg: ResourceConfig = {
  kind: 'fuel',
  fuel: { capacityLiters: 200 },
  updatedAt: '2026-01-01T00:00:00Z',
};
const waterCfg: ResourceConfig = {
  kind: 'water',
  water: { proaLiters: 150, popaLiters: 150 },
  updatedAt: '2026-01-01T00:00:00Z',
};
const gasCfg: ResourceConfig = {
  kind: 'gas',
  gas: { fullKg: 6.55, emptyKg: 3.8, netKg: 2.75 },
  updatedAt: '2026-01-01T00:00:00Z',
};

describe('deriveResources — gasoil', () => {
  it('% directe → litres = % × capacitat', () => {
    const events: AppEvent[] = [{ ...base('2026-01-02T00:00:00Z'), type: 'fuel_measure', percent: 60 }];
    const fuel = deriveResources(events, configMap(fuelCfg)).get('fuel')!;
    expect(fuel.percent).toBe(60);
    expect(fuel.fuelLiters).toBeCloseTo(120, 5);
  });

  it('PLE posa el nivell al 100%', () => {
    const events: AppEvent[] = [
      { ...base('2026-01-02T00:00:00Z'), type: 'fuel_measure', percent: 30 },
      { ...base('2026-01-03T00:00:00Z'), type: 'fuel_measure', refillToFull: true },
    ];
    const fuel = deriveResources(events, configMap(fuelCfg)).get('fuel')!;
    expect(fuel.percent).toBe(100);
    expect(fuel.fuelLiters).toBeCloseTo(200, 5);
  });

  it('afegir litres suma sobre el nivell anterior, saturat a la capacitat', () => {
    const events: AppEvent[] = [
      { ...base('2026-01-02T00:00:00Z'), type: 'fuel_measure', percent: 50 }, // 100 L
      { ...base('2026-01-03T00:00:00Z'), type: 'fuel_measure', addedLiters: 80 }, // 180 L
    ];
    const fuel = deriveResources(events, configMap(fuelCfg)).get('fuel')!;
    expect(fuel.fuelLiters).toBeCloseTo(180, 5);
    expect(fuel.percent).toBeCloseTo(90, 5);
  });

  it('sense mesures → percent null', () => {
    const fuel = deriveResources([], configMap(fuelCfg)).get('fuel')!;
    expect(fuel.percent).toBeNull();
  });
});

describe('deriveResources — aigua (tancs PROA/POPA i comptador comú)', () => {
  it('atribueix el consum al tanc actiu del tram en canviar de tanc', () => {
    // Comptador 1000 amb PROA actiu → mesura 1050 (PROA actiu) consumeix 50 de PROA →
    // canvi a POPA registrant 1050 → mesura 1080 (POPA) consumeix 30 de POPA.
    const events: AppEvent[] = [
      { ...base('2026-01-02T00:00:00Z'), type: 'water_measure', counter: 1000, activeTank: 'proa' },
      { ...base('2026-01-03T00:00:00Z'), type: 'water_measure', counter: 1050, activeTank: 'proa' },
      { ...base('2026-01-03T06:00:00Z'), type: 'water_measure', counter: 1050, activeTank: 'popa' },
      { ...base('2026-01-04T00:00:00Z'), type: 'water_measure', counter: 1080, activeTank: 'popa' },
    ];
    const w = deriveResources(events, configMap(waterCfg)).get('water')!;
    expect(w.waterProaLiters).toBeCloseTo(100, 5); // 150 − 50
    expect(w.waterPopaLiters).toBeCloseTo(120, 5); // 150 − 30
    expect(w.waterTotalLiters).toBeCloseTo(220, 5);
    expect(w.activeTank).toBe('popa');
  });

  it('omplir un tanc el posa a ple', () => {
    const events: AppEvent[] = [
      { ...base('2026-01-02T00:00:00Z'), type: 'water_measure', counter: 1000, activeTank: 'proa' },
      { ...base('2026-01-03T00:00:00Z'), type: 'water_measure', counter: 1100, activeTank: 'proa' }, // −100 PROA → 50
      { ...base('2026-01-04T00:00:00Z'), type: 'water_refill', tank: 'proa', toFull: true },
    ];
    const w = deriveResources(events, configMap(waterCfg)).get('water')!;
    expect(w.waterProaLiters).toBeCloseTo(150, 5);
  });

  it('el consum no fa baixar el tanc per sota de 0', () => {
    const events: AppEvent[] = [
      { ...base('2026-01-02T00:00:00Z'), type: 'water_measure', counter: 0, activeTank: 'proa' },
      { ...base('2026-01-03T00:00:00Z'), type: 'water_measure', counter: 999, activeTank: 'proa' },
    ];
    const w = deriveResources(events, configMap(waterCfg)).get('water')!;
    expect(w.waterProaLiters).toBe(0);
  });
});

describe('deriveResources — gas', () => {
  it('pes → % de la bombona actual', () => {
    const events: AppEvent[] = [{ ...base('2026-01-02T00:00:00Z'), type: 'gas_measure', weightKg: 5.1 }];
    const gas = deriveResources(events, configMap(gasCfg)).get('gas')!;
    // (5.1 − 3.8) / (6.55 − 3.8) = 1.3 / 2.75 ≈ 47.27%
    expect(gas.percent).toBeCloseTo((1.3 / 2.75) * 100, 4);
    expect(gas.gasWeightKg).toBeCloseTo(5.1, 5);
  });

  it('canviar bombona torna a plena (100%)', () => {
    const events: AppEvent[] = [
      { ...base('2026-01-02T00:00:00Z'), type: 'gas_measure', weightKg: 4.0 },
      { ...base('2026-01-03T00:00:00Z'), type: 'gas_swap' },
    ];
    const gas = deriveResources(events, configMap(gasCfg)).get('gas')!;
    expect(gas.percent).toBe(100);
    expect(gas.gasWeightKg).toBeCloseTo(6.55, 5);
  });
});

describe('deriveResourceConfig', () => {
  it('last-writer-wins per ordre i defaults per kinds sense upsert', () => {
    const c1: ResourceConfig = { kind: 'fuel', fuel: { capacityLiters: 100 }, updatedAt: '2026-01-01T00:00:00Z' };
    const c2: ResourceConfig = { kind: 'fuel', fuel: { capacityLiters: 250 }, updatedAt: '2026-01-05T00:00:00Z' };
    const events: AppEvent[] = [
      { ...base('2026-01-01T00:00:00Z'), type: 'resource_config_upsert', payload: c1 },
      { ...base('2026-01-05T00:00:00Z'), type: 'resource_config_upsert', payload: c2 },
    ];
    const configs = deriveResourceConfig(events);
    expect(configs.get('fuel')?.fuel?.capacityLiters).toBe(250);
    // El gas no té upsert → default amb pesos Campingaz.
    expect(configs.get('gas')?.gas?.fullKg).toBe(6.55);
  });
});
