import { db, type LocalEvent } from './db';
import { getAllEvents } from './repositories/events.repo';
import { recomputeAll } from './recompute';
import type { AppEvent } from '@/types/events';

/**
 * Backup/export del log d'esdeveniments.
 *
 * Com que el log és tota la font de veritat, exportar-lo és un backup complet i
 * reproduïble. Importar = afegir esdeveniments deduplicant per id. PLA.md secció 14.9.
 */

export interface BackupFile {
  app: 'boat-stock-manager';
  version: 1;
  exportedAt: string;
  events: AppEvent[];
}

/** Genera el JSON de backup amb tots els esdeveniments. */
export async function exportBackup(): Promise<string> {
  const events = await getAllEvents();
  const file: BackupFile = {
    app: 'boat-stock-manager',
    version: 1,
    exportedAt: new Date().toISOString(),
    events,
  };
  return JSON.stringify(file, null, 2);
}

/** Dispara la baixada del backup com a fitxer .json. */
export async function downloadBackup(): Promise<void> {
  const json = await exportBackup();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `boat-stock-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Importa un backup: afegeix els esdeveniments deduplicant per id (els existents no es
 * dupliquen) i recalcula. Els esdeveniments importats es marquen com a pendents perquè
 * se sincronitzin si encara no eren al núvol.
 */
export async function importBackup(json: string): Promise<number> {
  const parsed = JSON.parse(json) as BackupFile;
  if (parsed.app !== 'boat-stock-manager') {
    throw new Error('Fitxer de backup no vàlid.');
  }
  let added = 0;
  await db.transaction('rw', db.events, async () => {
    for (const ev of parsed.events) {
      const exists = await db.events.get(ev.id);
      if (!exists) {
        const row: LocalEvent = { ...ev, _pending: 1 };
        await db.events.put(row);
        added++;
      }
    }
  });
  await recomputeAll();
  return added;
}
