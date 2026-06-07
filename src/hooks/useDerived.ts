import { useEffect, useMemo, useState } from 'react';
import { useAllEvents, useInventory, useObjectsMap } from './useData';
import { estimateDuration, estimateWaterDuration } from '@/domain/inventory/duration';
import { stripLocalMeta } from '@/db/repositories/events.repo';
import { getDurationWindowDays } from '@/auth/session';
import { nowISO, diffDays } from '@/lib/time';
import type { ItemObject, InventoryEntry } from '@/types/entities';
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
