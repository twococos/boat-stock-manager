import { useEffect, useMemo, useState } from 'react';
import { Icon } from '@iconify/react/offline';
import { loadIconSets, searchIcons, ICON_SEARCH_LIMIT } from '@/features/objects/iconSets';
import { Search, X } from './icons';
import { t } from '@/text';

/**
 * Selector d'icona (Iconify, offline).
 *
 * Mostra una graella d'icones filtrables per paraules clau (català/anglès) provinents de
 * Tabler + un subconjunt de Game Icons. Els sets es carreguen lazy en muntar el selector.
 * El valor desat (`value`) és la clau Iconify triada (p.ex. `tabler:apple`); `onChange('')`
 * la treu. La cerca es capa a `ICON_SEARCH_LIMIT` resultats per no penjar el render.
 */
export function IconPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (key: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    loadIconSets().then(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, []);

  const results = useMemo(() => (ready ? searchIcons(query) : []), [ready, query]);
  const capped = results.length >= ICON_SEARCH_LIMIT;

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Search
          size={18}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-boat-400"
        />
        <input
          className="w-full rounded-xl border border-boat-100 py-3 pl-10 pr-9"
          placeholder={t.iconPicker.searchPlaceholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {value && (
          <button
            type="button"
            aria-label={t.iconPicker.removeIconAria}
            onClick={() => onChange('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-boat-400"
          >
            <X size={18} />
          </button>
        )}
      </div>

      <div className="grid max-h-48 grid-cols-6 gap-1 overflow-y-auto rounded-xl bg-boat-50 p-2">
        {!ready && (
          <p className="col-span-6 py-4 text-center text-sm text-boat-400">
            {t.iconPicker.loading}
          </p>
        )}
        {ready &&
          results.map((key) => {
            const active = key === value;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onChange(key)}
                className={`flex aspect-square items-center justify-center rounded-xl active:scale-90 ${
                  active ? 'bg-boat-700 text-white' : 'bg-white text-boat-700'
                }`}
              >
                <Icon icon={key} width={24} height={24} />
              </button>
            );
          })}
        {ready && results.length === 0 && (
          <p className="col-span-6 py-4 text-center text-sm text-boat-400">
            {t.iconPicker.noIcons}
          </p>
        )}
        {ready && capped && (
          <p className="col-span-6 py-2 text-center text-xs text-boat-400">
            {t.iconPicker.refineSearch}
          </p>
        )}
      </div>
    </div>
  );
}
