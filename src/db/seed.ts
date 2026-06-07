import { db } from './db';
import { commitObjectUpsert, commitLocationUpsert } from './commands';
import { newId } from '@/lib/id';
import { nowISO } from '@/lib/time';
import type { ItemObject, StowageLocation } from '@/types/entities';

const SEED_FLAG = 'boat-stock-manager.seeded';

/**
 * Sembra un conjunt inicial de llocs i objectes comuns perquè el primer usuari no es
 * trobi llistes buides. És idempotent: només s'executa un cop per dispositiu (marca a
 * localStorage). Els objectes/llocs es creen com a esdeveniments upsert i, per tant,
 * se sincronitzen amb la resta de la tripulació. Veure PLA.md (secció 14, punt 5).
 *
 * Nota: si un altre dispositiu ja ha sembrat i sincronitzat, aquests upserts seran
 * redundants però inofensius (mateixa entitat, last-writer-wins). Per evitar duplicats
 * de contingut entre dispositius, el seed només s'executa si NO hi ha cap esdeveniment
 * al log encara (vaixell "nou").
 */
export async function seedIfEmpty(userName: string): Promise<void> {
  if (localStorage.getItem(SEED_FLAG)) return;

  const eventCount = await db.events.count();
  if (eventCount > 0) {
    // Ja hi ha dades (probablement sincronitzades d'un altre dispositiu): no sembris.
    localStorage.setItem(SEED_FLAG, '1');
    return;
  }

  const now = nowISO();

  const locations: StowageLocation[] = [
    'Nevera',
    'Cuina',
    'Panyol de proa',
    'Sota el sofà de babord',
    'Sota el sofà d\'estribord',
    'Armari del lavabo',
  ].map((name) => ({ id: newId(), name, createdAt: now, updatedAt: now }));

  for (const loc of locations) {
    await commitLocationUpsert(userName, loc);
  }

  const water = locations.find((l) => l.name === 'Panyol de proa')!;
  const fridge = locations.find((l) => l.name === 'Nevera')!;

  const objects: ItemObject[] = [
    {
      id: newId(),
      name: 'Aigua 1,5 L',
      icon: 'water',
      stockType: 'food',
      quantityType: 'units',
      usualLocationIds: [water.id],
      foodCategory: 'water',
      expiry: { mode: 'never' },
      capacityLiters: 1.5,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: newId(),
      name: 'Ous',
      icon: 'egg',
      stockType: 'food',
      quantityType: 'units',
      usualLocationIds: [fridge.id],
      foodCategory: 'fridge',
      expiry: { mode: 'define_on_add' },
      createdAt: now,
      updatedAt: now,
    },
  ];

  for (const obj of objects) {
    await commitObjectUpsert(userName, obj);
  }

  localStorage.setItem(SEED_FLAG, '1');
}
