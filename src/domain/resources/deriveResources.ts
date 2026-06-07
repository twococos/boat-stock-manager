import type {
  ResourceConfig,
  ResourceKind,
  ResourceState,
  WaterTank,
} from '@/types/entities';
import type { AppEvent } from '@/types/events';
import { sortEvents } from '@/domain/inventory/ordering';

/**
 * Deriva l'estat actual de cada recurs continu (gasoil, aigua, gas) reproduint les seves
 * mesures absolutes en ordre determinista. Paral·lel a `deriveInventory`, però amb mesures
 * absolutes (no deltes additius). Veure el pla i CONTEXT.md.
 *
 * - **Gasoil:** l'última mesura fixa el `%`; omplir (PLE/litres) actualitza el nivell. Els
 *   litres surten de `% × capacitat`.
 * - **Aigua:** dos tancs (PROA/POPA) amb un sol comptador comú. Cada lectura tanca el tram
 *   anterior: el consum `counter − lastCounter` es resta del tanc que estava actiu en aquell
 *   tram. Omplir posa el tanc a ple o suma litres (saturat a la capacitat).
 * - **Gas:** `gas_swap` torna a plena; `gas_measure` fixa el pes. El `%` és de la bombona
 *   actual: `(pes − buit) / (ple − buit)`.
 */
export function deriveResources(
  events: readonly AppEvent[],
  configs: ReadonlyMap<ResourceKind, ResourceConfig>,
): Map<ResourceKind, ResourceState> {
  const sorted = sortEvents(events);
  return new Map<ResourceKind, ResourceState>([
    ['fuel', deriveFuel(sorted, configs.get('fuel'))],
    ['water', deriveWater(sorted, configs.get('water'))],
    ['gas', deriveGas(sorted, configs.get('gas'))],
  ]);
}

const clamp = (v: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, v));

// ── gasoil ───────────────────────────────────────────────────────────────────
function deriveFuel(
  sorted: readonly AppEvent[],
  config: ResourceConfig | undefined,
): ResourceState {
  const capacity = config?.fuel?.capacityLiters ?? 0;
  let percent: number | null = null;
  let lastMeasuredAt: string | undefined;

  for (const ev of sorted) {
    if (ev.type !== 'fuel_measure') continue;
    if (ev.refillToFull) {
      percent = 100;
    } else if (ev.addedLiters !== undefined && capacity > 0) {
      const prevLiters = ((percent ?? 0) / 100) * capacity;
      percent = clamp(((prevLiters + ev.addedLiters) / capacity) * 100, 0, 100);
    } else if (ev.percent !== undefined) {
      percent = clamp(ev.percent, 0, 100);
    }
    lastMeasuredAt = ev.occurredAt;
  }

  return {
    kind: 'fuel',
    percent,
    fuelLiters: percent === null ? undefined : (percent / 100) * capacity,
    lastMeasuredAt,
  };
}

// ── aigua ──────────────────────────────────────────────────────────────────────
function deriveWater(
  sorted: readonly AppEvent[],
  config: ResourceConfig | undefined,
): ResourceState {
  const proaCap = config?.water?.proaLiters ?? 0;
  const popaCap = config?.water?.popaLiters ?? 0;

  // Litres a cada tanc. Comencen plens (assumpció raonable; un refill ho corregeix).
  const liters: Record<WaterTank, number> = { proa: proaCap, popa: popaCap };
  let lastCounter: number | undefined;
  let activeTank: WaterTank = 'proa';
  let seen = false;
  let lastMeasuredAt: string | undefined;

  const cap = (t: WaterTank) => (t === 'proa' ? proaCap : popaCap);

  for (const ev of sorted) {
    if (ev.type === 'water_measure') {
      if (lastCounter !== undefined) {
        const consumed = Math.max(0, ev.counter - lastCounter);
        // El consum del tram que es tanca s'atribueix al tanc que hi estava actiu.
        liters[activeTank] = clamp(liters[activeTank] - consumed, 0, cap(activeTank));
      }
      lastCounter = ev.counter;
      activeTank = ev.activeTank;
      seen = true;
      lastMeasuredAt = ev.occurredAt;
    } else if (ev.type === 'water_refill') {
      if (ev.toFull) {
        liters[ev.tank] = cap(ev.tank);
      } else if (ev.addedLiters !== undefined) {
        liters[ev.tank] = clamp(liters[ev.tank] + ev.addedLiters, 0, cap(ev.tank));
      }
      seen = true;
      lastMeasuredAt = ev.occurredAt;
    }
  }

  const totalCap = proaCap + popaCap;
  const total = liters.proa + liters.popa;
  const percent =
    !seen || totalCap <= 0 ? null : clamp((total / totalCap) * 100, 0, 100);

  return {
    kind: 'water',
    percent,
    waterProaLiters: liters.proa,
    waterPopaLiters: liters.popa,
    waterTotalLiters: total,
    activeTank,
    lastCounter,
    lastMeasuredAt,
  };
}

// ── gas ──────────────────────────────────────────────────────────────────────
function deriveGas(
  sorted: readonly AppEvent[],
  config: ResourceConfig | undefined,
): ResourceState {
  const fullKg = config?.gas?.fullKg ?? 6.55;
  const emptyKg = config?.gas?.emptyKg ?? 3.8;

  let weightKg: number | undefined;
  let lastMeasuredAt: string | undefined;

  for (const ev of sorted) {
    if (ev.type === 'gas_swap') {
      weightKg = fullKg;
      lastMeasuredAt = ev.occurredAt;
    } else if (ev.type === 'gas_measure') {
      weightKg = ev.weightKg;
      lastMeasuredAt = ev.occurredAt;
    }
  }

  const span = fullKg - emptyKg;
  const percent =
    weightKg === undefined || span <= 0
      ? null
      : clamp(((weightKg - emptyKg) / span) * 100, 0, 100);

  return { kind: 'gas', percent, gasWeightKg: weightKg, lastMeasuredAt };
}
