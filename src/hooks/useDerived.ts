import { useMemo } from 'react';
import { useAllEvents, useInventory, useObjectsMap } from './useData';
import { estimateDuration } from '@/domain/inventory/duration';
import { stripLocalMeta } from '@/db/repositories/events.repo';
import { nowISO, diffDays } from '@/lib/time';
import type { ItemObject, InventoryEntry } from '@/types/entities';
import type { AppEvent } from '@/types/events';

const DURATION_WINDOW_DAYS = 3;

export interface DurationRow {
  object: ItemObject;
  quantity: number;
  daysRemaining: number | null;
}

/** Objectes amb `trackDuration` i la seva durada estimada (últims 3 dies). */
export function useDurations(): DurationRow[] {
  const rawEvents = useAllEvents();
  const inventory = useInventory();
  const objectsMap = useObjectsMap();

  return useMemo(() => {
    const events: AppEvent[] = (rawEvents ?? []).map((r) =>
      stripLocalMeta(r as never),
    );
    const invMap = new Map((inventory ?? []).map((e) => [e.objectId, e]));
    const now = nowISO();
    const rows: DurationRow[] = [];

    for (const obj of objectsMap.values()) {
      if (!obj.trackDuration) continue;
      const quantity = invMap.get(obj.id)?.quantity ?? 0;
      const { daysRemaining } = estimateDuration(
        obj.id,
        quantity,
        events,
        DURATION_WINDOW_DAYS,
        now,
      );
      rows.push({ object: obj, quantity, daysRemaining });
    }
    return rows;
  }, [rawEvents, inventory, objectsMap]);
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
