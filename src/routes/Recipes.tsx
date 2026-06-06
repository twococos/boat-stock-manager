import { useState } from 'react';
import type { Recipe } from '@/types/entities';
import { Sheet } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/common';
import { RecipeForm } from '@/features/recipes/RecipeForm';
import { useRecipes } from '@/hooks/useData';
import { commitRecipeUpsert } from '@/db/commands';
import { useAuth } from '@/auth/AuthProvider';

/** Guia de receptes amb editor. PLA.md secció 12.5. */
export function Recipes() {
  const { userName } = useAuth();
  const recipes = useRecipes() ?? [];
  const [editing, setEditing] = useState<Recipe | null>(null);
  const [creating, setCreating] = useState(false);

  async function save(r: Recipe) {
    if (!userName) return;
    await commitRecipeUpsert(userName, r);
    setEditing(null);
    setCreating(false);
  }

  return (
    <div className="flex flex-col gap-3 pt-2">
      <h1 className="text-xl font-bold">Receptes</h1>

      {recipes.length === 0 ? (
        <EmptyState icon="📖" text="Cap recepta encara." />
      ) : (
        <ul className="flex flex-col gap-2">
          {recipes.map((r) => (
            <li key={r.id}>
              <button
                onClick={() => setEditing(r)}
                className="flex w-full items-center justify-between rounded-2xl bg-white p-3 shadow-sm active:scale-[0.98]"
              >
                <span className="font-semibold">{r.title}</span>
                <span className="text-xs text-boat-500">
                  {r.needsCooking ? '🔥 ' : ''}
                  {r.ingredients.length} ingr.
                  {r.prepTimeMinutes ? ` · ${r.prepTimeMinutes}′` : ''}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Button onClick={() => setCreating(true)}>+ Nova recepta</Button>

      <Sheet open={creating} onClose={() => setCreating(false)} title="Nova recepta">
        <RecipeForm onSave={save} onCancel={() => setCreating(false)} />
      </Sheet>
      <Sheet open={!!editing} onClose={() => setEditing(null)} title="Editar recepta">
        {editing && (
          <RecipeForm initial={editing} onSave={save} onCancel={() => setEditing(null)} />
        )}
      </Sheet>
    </div>
  );
}
