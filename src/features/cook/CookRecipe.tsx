import { useState } from 'react';
import type { Recipe } from '@/types/entities';
import { Sheet } from '@/components/ui/Sheet';
import { EmptyState } from '@/components/ui/common';
import { Flame, BookOpen } from '@/components/ui/icons';
import { useRecipes } from '@/hooks/useData';
import { CookRecipePanel } from './CookRecipePanel';
import { t } from '@/text';

/**
 * Cuinar una recepta: tria recepta de la llista i, en un full, comensals + ingredients.
 * La lògica de cuinar viu a CookRecipePanel (reutilitzat des dels detalls). PLA.md 12.2.
 */
export function CookRecipe({ onDone }: { onDone: () => void }) {
  const recipes = useRecipes();
  const [selected, setSelected] = useState<Recipe | null>(null);

  if ((recipes ?? []).length === 0) {
    return <EmptyState icon={BookOpen} text={t.cook.noRecipes} />;
  }

  return (
    <>
      <ul className="flex flex-col gap-2">
        {(recipes ?? []).map((r) => (
          <li key={r.id}>
            <button
              onClick={() => setSelected(r)}
              className="flex w-full items-center justify-between rounded-2xl bg-white p-3 shadow-sm active:scale-[0.98]"
            >
              <span className="font-semibold">{r.title}</span>
              <span className="flex items-center gap-1 text-xs text-boat-500">
                {r.needsCooking && <Flame size={14} className="text-red-500" />}
                {t.recipes.ingredientsCount(r.ingredients.length)}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <Sheet open={!!selected} onClose={() => setSelected(null)} title={selected?.title}>
        {selected && (
          <CookRecipePanel
            recipe={selected}
            onDone={() => {
              setSelected(null);
              onDone();
            }}
          />
        )}
      </Sheet>
    </>
  );
}
