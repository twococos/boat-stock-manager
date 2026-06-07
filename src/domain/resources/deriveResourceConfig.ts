import type { ResourceConfig, ResourceKind } from '@/types/entities';
import type { AppEvent } from '@/types/events';
import { sortEvents } from '@/domain/inventory/ordering';

/**
 * Valors per defecte de configuració de recursos. S'usen quan encara no s'ha emès cap
 * `resource_config_upsert` per a un `kind` (l'usuari els pot editar a la pantalla de detall).
 * Les capacitats de tancs es deixen a 0 fins que es configurin; el gas porta els pesos
 * típics de la bombona Campingaz.
 */
export const DEFAULT_RESOURCE_CONFIG: Record<ResourceKind, ResourceConfig> = {
  fuel: { kind: 'fuel', fuel: { capacityLiters: 0 }, updatedAt: '1970-01-01T00:00:00.000Z' },
  water: {
    kind: 'water',
    water: { proaLiters: 0, popaLiters: 0 },
    updatedAt: '1970-01-01T00:00:00.000Z',
  },
  gas: {
    kind: 'gas',
    gas: { fullKg: 6.55, emptyKg: 3.8, netKg: 2.75 },
    updatedAt: '1970-01-01T00:00:00.000Z',
  },
};

/**
 * Deriva la config de cada recurs a partir dels esdeveniments `resource_config_upsert`.
 * Last-writer-wins per ordre determinista (el darrer upsert d'un `kind` guanya). Els kinds
 * sense cap upsert reben {@link DEFAULT_RESOURCE_CONFIG}.
 */
export function deriveResourceConfig(
  events: readonly AppEvent[],
): Map<ResourceKind, ResourceConfig> {
  const configs = new Map<ResourceKind, ResourceConfig>();
  for (const kind of ['fuel', 'water', 'gas'] as ResourceKind[]) {
    configs.set(kind, DEFAULT_RESOURCE_CONFIG[kind]);
  }
  for (const ev of sortEvents(events)) {
    if (ev.type !== 'resource_config_upsert') continue;
    configs.set(ev.payload.kind, ev.payload);
  }
  return configs;
}
