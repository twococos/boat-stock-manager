import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ItemObject } from '@/types/entities';
import { TileButton } from '@/components/ui/common';
import { CookRecipe } from '@/features/cook/CookRecipe';
import { QuickConsume } from '@/features/cook/QuickConsume';
import { useObjects } from '@/hooks/useData';
import { COOK_CATEGORIES, filterByCategories } from '@/features/cook/foodFilters';

type Mode = 'menu' | 'recipe' | 'water' | 'snacks' | 'dessert' | 'breakfast' | 'all';

/** Menú CUINAR amb les opcions principals. PLA.md secció 12.2. */
export function CookMenu() {
  const navigate = useNavigate();
  const objects = useObjects() ?? [];
  const [mode, setMode] = useState<Mode>('menu');

  const back = () => setMode('menu');
  const done = () => navigate('/');

  if (mode === 'menu') {
    return (
      <div className="flex flex-col gap-4 pt-2">
        <h1 className="text-xl font-bold">Què cuinem?</h1>
        <div className="grid grid-cols-2 gap-3">
          <TileButton icon="📖" label="Recepta" onClick={() => setMode('recipe')} className="bg-boat-700 text-white" />
          <TileButton icon="💧" label="Aigua" onClick={() => setMode('water')} className="bg-white text-boat-900" />
          <TileButton icon="🥨" label="Picar" onClick={() => setMode('snacks')} className="bg-white text-boat-900" />
          <TileButton icon="🍰" label="Postre" onClick={() => setMode('dessert')} className="bg-white text-boat-900" />
          <TileButton icon="🥐" label="Esmorzar" onClick={() => setMode('breakfast')} className="bg-white text-boat-900" />
          <TileButton icon="🔎" label="Tot" onClick={() => setMode('all')} className="bg-boat-100 text-boat-900" />
        </div>
      </div>
    );
  }

  const titles: Record<Exclude<Mode, 'menu'>, string> = {
    recipe: 'Receptes',
    water: 'Aigua',
    snacks: 'Per picar',
    dessert: 'Postres i fruita',
    breakfast: 'Esmorzar',
    all: 'Tots els objectes',
  };

  return (
    <div className="flex flex-col gap-4 pt-2">
      <button onClick={back} className="self-start text-sm text-boat-600">
        ← Tornar
      </button>
      <h1 className="text-xl font-bold">{titles[mode]}</h1>

      {mode === 'recipe' ? (
        <CookRecipe onDone={done} />
      ) : mode === 'all' ? (
        <AllObjectsConsume objects={objects} onDone={done} />
      ) : (
        <QuickConsume
          title={titles[mode]}
          objects={filterByCategories(objects, COOK_CATEGORIES[mode]!)}
          onDone={done}
        />
      )}
    </div>
  );
}

/** Llista completa amb cerca + filtre per a l'opció "Tot". */
function AllObjectsConsume({
  objects,
  onDone,
}: {
  objects: ItemObject[];
  onDone: () => void;
}) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(
    () =>
      objects.filter((o) => o.name.toLowerCase().includes(query.toLowerCase())),
    [objects, query],
  );
  return (
    <div className="flex flex-col gap-3">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Cercar objecte…"
        className="rounded-xl border border-boat-100 px-4 py-3"
      />
      <QuickConsume title="Tots els objectes" objects={filtered} onDone={onDone} />
    </div>
  );
}
