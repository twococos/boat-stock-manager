import { describe, it, expect } from 'vitest';
import { LEGACY_ICON_MAP } from './iconSets';
import tabler from '@iconify-json/tabler/icons.json';
import gameIcons from './gameIconsSubset.json';

// Comprova que CADA clau de migració apunta a una icona que existeix realment a
// algun dels sets bundlejats. Si algú edita el mapa amb un nom inventat, salta aquí.
describe('LEGACY_ICON_MAP', () => {
  const tablerIcons = new Set(Object.keys(tabler.icons));
  const tablerAliases = new Set(Object.keys((tabler as { aliases?: object }).aliases ?? {}));
  const giIcons = new Set(Object.keys(gameIcons.icons));

  const exists = (key: string): boolean => {
    const [prefix, name] = key.split(':');
    if (prefix === 'tabler') return tablerIcons.has(name!) || tablerAliases.has(name!);
    if (prefix === 'game-icons') return giIcons.has(name!);
    return false;
  };

  it.each(Object.entries(LEGACY_ICON_MAP))('%s → %s existeix', (_legacy, key) => {
    expect(exists(key), `${key} no existeix a cap set`).toBe(true);
  });
});
