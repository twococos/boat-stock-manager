import { useEffect, useMemo, useState } from 'react';
import {
  useAllEvents,
  useInventory,
  useObjectsMap,
  useResourceConfigs,
  useResourceStates,
} from './useData';
import { estimateDuration, estimateWaterDuration } from '@/domain/inventory/duration';
import { estimateResourceDuration } from '@/domain/resources/resourceDuration';
import { stripLocalMeta } from '@/db/repositories/events.repo';
import { getDurationWindowDays } from '@/auth/session';
import { nowISO, diffDays } from '@/lib/time';
import type {
  ItemObject,
  InventoryEntry,
  ResourceKind,
  ResourceState,
} from '@/types/entities';
import type { AppEvent } from '@/types/events';

/** Finestra reactiva (dies) per estimar el ritme de consum; configurable a Ajustos. */
function useDurationWindow(): number {
  const [days, setDays] = useState(getDurationWindowDays());
  useEffect(() => {
    const update = () => setDays(getDurationWindowDays());
    window.addEventListener('duration-window-change', update);
    window.addEventListener('storage', update);
    return () => {
      window.removeEventListener('duration-window-change', update);
      window.removeEventListener('storage', update);
    };
  }, []);
  return days;
}

export interface DurationRow {
  /** Identificador de fila (objectId, o 'water' per a l'aigua agregada). */
  key: string;
  /** Etiqueta a mostrar. */
  label: string;
  /** Icona de l'objecte (o d'aigua per a l'agregat). */
  icon?: string;
  /** Text de la quantitat en estoc (p.ex. "24 L" o "3 unitats"). */
  stockLabel: string;
  daysRemaining: number | null;
  /** Objecte associat (per obrir-ne el detall); absent per a l'aigua agregada. */
  object?: ItemObject;
}

/**
 * Files de durada estimada per al dashboard.
 *
 * - L'AIGUA potable s'agrega en una sola fila (per litres totals); els objectes d'aigua
 *   individuals NO surten per separat.
 * - La resta d'objectes amb `trackDuration` s'estimen individualment com sempre.
 */
export function useDurations(): DurationRow[] {
  const rawEvents = useAllEvents();
  const inventory = useInventory();
  const objectsMap = useObjectsMap();
  const windowDays = useDurationWindow();

  return useMemo(() => {
    const events: AppEvent[] = (rawEvents ?? []).map((r) =>
      stripLocalMeta(r as never),
    );
    const invMap = new Map((inventory ?? []).map((e) => [e.objectId, e]));
    const stockByObject = new Map(
      [...invMap.entries()].map(([id, e]) => [id, e.quantity]),
    );
    const now = nowISO();
    const rows: DurationRow[] = [];

    // Aigua agregada (sempre primera, si n'hi ha).
    const waterObjects = [...objectsMap.values()].filter(
      (o) => o.foodCategory === 'water',
    );
    if (waterObjects.length > 0) {
      const { daysRemaining, litersInStock } = estimateWaterDuration(
        waterObjects,
        stockByObject,
        events,
        windowDays,
        now,
      );
      rows.push({
        key: 'water',
        label: 'Aigua potable',
        icon: 'water',
        stockLabel: `${Math.round(litersInStock * 10) / 10} L`,
        daysRemaining,
      });
    }

    // Resta d'objectes amb trackDuration (excloent l'aigua).
    for (const obj of objectsMap.values()) {
      if (!obj.trackDuration || obj.foodCategory === 'water') continue;
      const quantity = invMap.get(obj.id)?.quantity ?? 0;
      const { daysRemaining } = estimateDuration(
        obj.id,
        quantity,
        events,
        windowDays,
        now,
      );
      rows.push({
        key: obj.id,
        label: obj.name,
        icon: obj.icon,
        stockLabel: `${formatStock(quantity, obj.quantityType)} en estoc`,
        daysRemaining,
        object: obj,
      });
    }
    return rows;
  }, [rawEvents, inventory, objectsMap, windowDays]);
}

function formatStock(qty: number, type: ItemObject['quantityType']): string {
  const rounded = Math.round(qty * 100) / 100;
  return type === 'units' ? `${rounded}` : `${rounded} ${type}`;
}

export interface ExpiringRow {
  object: ItemObject;
  entry: InventoryEntry;
  soonestExpiresAt: string;
  daysLeft: number;
}

/** Objectes amb lots que caduquen dins de `withinDays` dies, ordenats per urgència. */
export function useExpiring(withinDays = 7): ExpiringRow[] {
  const inventory = useInventory();
  const objectsMap = useObjectsMap();

  return useMemo(() => {
    const now = nowISO();
    const rows: ExpiringRow[] = [];

    for (const entry of inventory ?? []) {
      if (!entry.lots || entry.lots.length === 0) continue;
      const obj = objectsMap.get(entry.objectId);
      if (!obj) continue;

      let soonest: string | undefined;
      for (const lot of entry.lots) {
        if (!lot.expiresAt) continue;
        if (!soonest || lot.expiresAt < soonest) soonest = lot.expiresAt;
      }
      if (!soonest) continue;

      const daysLeft = diffDays(now, soonest);
      if (daysLeft <= withinDays) {
        rows.push({ object: obj, entry, soonestExpiresAt: soonest, daysLeft });
      }
    }
    rows.sort((a, b) => a.daysLeft - b.daysLeft);
    return rows;
  }, [inventory, objectsMap, withinDays]);
}

// ── recursos continus (gasoil, aigua de tancs, gas) ──────────────────────────
export interface ResourceDurationRow {
  kind: ResourceKind;
  state: ResourceState;
  /** Percentatge 0..100 (o null si encara no hi ha mesura). */
  percent: number | null;
  /** Dies estimats que durarà al ritme dels últims `windowDays` (null si no hi ha dades). */
  daysRemaining: number | null;
}

/**
 * Files de durada dels recursos continus per a la targeta del dashboard i la pantalla de
 * detall. El nivell restant actual ve de l'estat derivat (`deriveResources`): litres per
 * gasoil/aigua, kg de gas net (pes − buit) per al gas.
 */
export function useResourceDurations(): ResourceDurationRow[] {
  const rawEvents = useAllEvents();
  const states = useResourceStates();
  const configs = useResourceConfigs();
  const windowDays = useDurationWindow();

  return useMemo(() => {
    const events: AppEvent[] = (rawEvents ?? []).map((r) => stripLocalMeta(r as never));
    const now = nowISO();
    const configByKind = new Map((configs ?? []).map((c) => [c.kind, c]));
    const order: ResourceKind[] = ['fuel', 'water', 'gas'];
    const stateByKind = new Map((states ?? []).map((s) => [s.kind, s]));

    return order
      .map((kind) => stateByKind.get(kind))
      .filter((s): s is ResourceState => s !== undefined)
      .map((state) => {
        const config = configByKind.get(state.kind);
        const currentLevel = currentLevelFor(state, config?.gas?.emptyKg);
        const { daysRemaining } = estimateResourceDuration(
          state.kind,
          events,
          config,
          currentLevel,
          windowDays,
          now,
        );
        return { kind: state.kind, state, percent: state.percent, daysRemaining };
      });
  }, [rawEvents, states, configs, windowDays]);
}

/** Nivell restant actual en les unitats de la sèrie de consum (litres o kg de gas net). */
function currentLevelFor(state: ResourceState, gasEmptyKg = 3.8): number | null {
  switch (state.kind) {
    case 'fuel':
      return state.fuelLiters ?? null;
    case 'water':
      return state.waterTotalLiters ?? null;
    case 'gas':
      return state.gasWeightKg === undefined ? null : Math.max(0, state.gasWeightKg - gasEmptyKg);
  }
}
