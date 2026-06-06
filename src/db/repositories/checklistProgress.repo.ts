import { db } from '../db';
import type { ChecklistProgress, ID } from '@/types/entities';
import { nowISO } from '@/lib/time';

/**
 * Progrés de checklists: store LOCAL i mai sincronitzat.
 *
 * Les checklists es fan sovint i només serveixen per comprovar en el moment que no es
 * deixa res per fer. El progrés (items tatxats) viu només en aquest dispositiu.
 * Veure PLA.md (secció 12.6).
 */
export async function getProgress(templateId: ID): Promise<ChecklistProgress | undefined> {
  return db.checklistProgress.get(templateId);
}

/** Commuta l'estat tatxat d'un item dins una checklist. */
export async function toggleItem(templateId: ID, itemId: ID): Promise<void> {
  await db.transaction('rw', db.checklistProgress, async () => {
    const current = await db.checklistProgress.get(templateId);
    const checked = new Set(current?.checkedItemIds ?? []);
    if (checked.has(itemId)) checked.delete(itemId);
    else checked.add(itemId);
    await db.checklistProgress.put({
      templateId,
      checkedItemIds: [...checked],
      updatedAt: nowISO(),
    });
  });
}

/** Reinicia el progrés d'una checklist (desmarca tots els items). */
export async function resetProgress(templateId: ID): Promise<void> {
  await db.checklistProgress.put({
    templateId,
    checkedItemIds: [],
    updatedAt: nowISO(),
  });
}
