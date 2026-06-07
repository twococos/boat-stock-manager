import { ca } from './ca';
import type { Dict } from './ca';

/**
 * Selector d'idioma. Avui només català. Per afegir un idioma:
 *  1. crear `src/text/xx.ts` amb la mateixa forma que `ca` (el tipus `Dict` ho garanteix),
 *  2. importar-lo aquí i afegir-lo a `dictionaries`,
 *  3. canviar `lang` (o llegir-lo d'ajustos / del navegador).
 */
const dictionaries = { ca } satisfies Record<string, Dict>;

const lang: keyof typeof dictionaries = 'ca';

/**
 * Tot el text d'UI. `t` és el diccionari de l'idioma actiu.
 * Ús: `t.settings.title`, `t.object.spendTitle(name)`, `t.object.stockType[obj.stockType]`.
 */
export const t = dictionaries[lang];

export type { Dict } from './ca';
