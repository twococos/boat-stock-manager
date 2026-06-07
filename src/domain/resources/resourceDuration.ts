import type { ISOTimestamp, ResourceConfig, ResourceKind } from '@/types/entities';
import type { AppEvent } from '@/types/events';
import { sortEvents } from '@/domain/inventory/ordering';
import { diffDays } from '@/lib/time';

/**
 * Estimació de durada per als recursos continus, anàloga a `domain/inventory/duration.ts`
 * però amb mesures absolutes: el consum surt de les DIFERÈNCIES entre mesures consecutives.
 *
 * Es construeix una sèrie temporal del consum (en litres equivalents) i se sumen els
 * descensos dins la finestra `[now − windowDays, now]`. Les pujades (omplir / canviar
 * bombona) no compten com a consum. Cal ≥1 descens dins la finestra; si no, `daysRemaining
 * = null` ("sense estimació"). El nivell actual restant l'aporta el cridador (de
 * `deriveResources`), ja que és l'única font fiable de l'estat present.
 */
export interface ResourceDurationEstimate {
  ratePerDay: number; // litres equivalents consumits per dia
  daysRemaining: number | null;
}

/**
 * Consum (litres equivalents) per cada mesura, com a sèrie temporal de descensos. Per a
 * cada recurs es tradueix la diferència entre mesures consecutives a litres consumits:
 * - fuel: descens de litres (% × capacitat).
 * - water: augment del comptador comú (= litres consumits del tanc actiu).
 * - gas: descens de pes × (netKg / spanKg) per passar de kg de bombona a kg de gas net…
 *   simplificat: descens de pes en kg (proporcional al consum). Un swap no compta.
 */
function consumptionSeries(
  kind: ResourceKind,
  sorted: readonly AppEvent[],
  config: ResourceConfig | undefined,
): { at: ISOTimestamp; consumed: number }[] {
  const out: { at: ISOTimestamp; consumed: number }[] = [];

  if (kind === 'fuel') {
    const capacity = config?.fuel?.capacityLiters ?? 0;
    let liters: number | undefined;
    let percent = 0;
    for (const ev of sorted) {
      if (ev.type !== 'fuel_measure') continue;
      if (ev.refillToFull) percent = 100;
      else if (ev.addedLiters !== undefined && capacity > 0)
        percent = Math.min(100, percent + (ev.addedLiters / capacity) * 100);
      else if (ev.percent !== undefined) percent = ev.percent;
      const next = (percent / 100) * capacity;
      if (liters !== undefined) out.push({ at: ev.occurredAt, consumed: Math.max(0, liters - next) });
      liters = next;
    }
    return out;
  }

  if (kind === 'water') {
    let counter: number | undefined;
    for (const ev of sorted) {
      if (ev.type !== 'water_measure') continue;
      if (counter !== undefined)
        out.push({ at: ev.occurredAt, consumed: Math.max(0, ev.counter - counter) });
      counter = ev.counter;
    }
    return out;
  }

  // gas
  let weight: number | undefined;
  for (const ev of sorted) {
    if (ev.type === 'gas_swap') {
      weight = config?.gas?.fullKg ?? 6.55; // swap reomple: no és consum
      continue;
    }
    if (ev.type !== 'gas_measure') continue;
    if (weight !== undefined)
      out.push({ at: ev.occurredAt, consumed: Math.max(0, weight - ev.weightKg) });
    weight = ev.weightKg;
  }
  return out;
}

/**
 * Estima la durada d'un recurs combinant el ritme de consum dels últims `windowDays` amb el
 * nivell restant actual (`currentLevel`, en les mateixes unitats que la sèrie de consum:
 * litres per fuel/water, kg per gas).
 */
export function estimateResourceDuration(
  kind: ResourceKind,
  events: readonly AppEvent[],
  config: ResourceConfig | undefined,
  currentLevel: number | null,
  windowDays: number,
  now: ISOTimestamp,
): ResourceDurationEstimate {
  const series = consumptionSeries(kind, sortEvents(events), config);
  let consumed = 0;
  for (const s of series) {
    const age = diffDays(s.at, now);
    if (age < 0 || age > windowDays) continue;
    consumed += s.consumed;
  }
  if (consumed <= 0 || currentLevel === null) return { ratePerDay: 0, daysRemaining: null };
  const ratePerDay = consumed / windowDays;
  return { ratePerDay, daysRemaining: currentLevel / ratePerDay };
}
