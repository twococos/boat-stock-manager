import type { AppEvent, StockBarrierEvent } from '@/types/events';
import { sortEvents } from './ordering';

/**
 * Selecció de la barrera de tall activa.
 *
 * La barrera activa és l'última `stock_barrier` per ordre determinista (clau més gran). És
 * el que fa que "val l'última barrera emesa" (i que un rewind posterior pugui des-rebobinar).
 * Lògica única aquí perquè la comparteixin la derivació, el sync i la UI de l'historial.
 */
export function activeBarrier(events: readonly AppEvent[]): StockBarrierEvent | null {
  let found: StockBarrierEvent | null = null;
  for (const ev of sortEvents(events)) {
    if (ev.type === 'stock_barrier') found = ev;
  }
  return found;
}

/** Última barrera de mode `reset` per ordre determinista (per a la neteja en cascada). */
export function activeResetBarrier(events: readonly AppEvent[]): StockBarrierEvent | null {
  let found: StockBarrierEvent | null = null;
  for (const ev of sortEvents(events)) {
    if (ev.type === 'stock_barrier' && ev.mode === 'reset') found = ev;
  }
  return found;
}
