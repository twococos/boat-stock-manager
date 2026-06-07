import { useState } from 'react';
import { searchFoodIcons } from '@/features/objects/foodIcons';
import { Search, X } from './icons';
import { t } from '@/text';

/**
 * Selector d'icona de menjar amb barra de cerca.
 *
 * Mostra una graella d'icones lucide filtrables per paraules clau (català/anglès).
 * El valor desat (`value`) és la clau de la icona triada; `onChange('')` la treu.
 */
export function IconPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (key: string) => void;
}) {
  const [query, setQuery] = useState('');
  const results = searchFoodIcons(query);

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
        {results.map((entry) => {
          const Icon = entry.Icon;
          const active = entry.key === value;
          return (
            <button
              key={entry.key}
              type="button"
              onClick={() => onChange(entry.key)}
              className={`flex aspect-square items-center justify-center rounded-xl active:scale-90 ${
                active ? 'bg-boat-700 text-white' : 'bg-white text-boat-700'
              }`}
            >
              <Icon size={24} />
            </button>
          );
        })}
        {results.length === 0 && (
          <p className="col-span-6 py-4 text-center text-sm text-boat-400">
            {t.iconPicker.noIcons}
          </p>
        )}
      </div>
    </div>
  );
}
