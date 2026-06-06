import { useState } from 'react';
import type { Recipe, RecipeIngredient } from '@/types/entities';
import { Button } from '@/components/ui/Button';
import { X, Flame } from '@/components/ui/icons';
import { useObjects } from '@/hooks/useData';
import { newId } from '@/lib/id';
import { nowISO } from '@/lib/time';

/** Editor de receptes: títol, ingredients per persona, temps, foc, passos. PLA.md 12.5. */
export function RecipeForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Recipe;
  onSave: (r: Recipe) => void;
  onCancel: () => void;
}) {
  const objects = useObjects() ?? [];
  const [title, setTitle] = useState(initial?.title ?? '');
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>(
    initial?.ingredients ?? [],
  );
  const [prepTime, setPrepTime] = useState(initial?.prepTimeMinutes ?? 0);
  const [needsCooking, setNeedsCooking] = useState(initial?.needsCooking ?? false);
  const [stepsText, setStepsText] = useState((initial?.steps ?? []).join('\n'));

  const field = 'rounded-xl border border-boat-100 px-4 py-3 w-full';

  function addIngredient() {
    const first = objects[0];
    if (!first) return;
    setIngredients((p) => [...p, { objectId: first.id, quantityPerPerson: 1 }]);
  }

  function submit() {
    if (!title.trim()) return;
    const now = nowISO();
    const recipe: Recipe = {
      id: initial?.id ?? newId(),
      title: title.trim(),
      ingredients: ingredients.filter((i) => i.quantityPerPerson > 0),
      prepTimeMinutes: prepTime > 0 ? prepTime : undefined,
      needsCooking,
      steps: stepsText.trim()
        ? stepsText.split('\n').map((s) => s.trim()).filter(Boolean)
        : undefined,
      createdAt: initial?.createdAt ?? now,
      updatedAt: now,
    };
    onSave(recipe);
  }

  if (objects.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-boat-600">
          Cal crear objectes abans de fer una recepta (un ingredient ha d'existir
          primer).
        </p>
        <Button variant="secondary" onClick={onCancel}>Tancar</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <input className={field} placeholder="Títol" value={title} onChange={(e) => setTitle(e.target.value)} />

      <label className="text-sm font-medium text-boat-700">Ingredients (per persona)</label>
      {ingredients.map((ing, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <select
            className="flex-1 rounded-xl border border-boat-100 px-2 py-2"
            value={ing.objectId}
            onChange={(e) =>
              setIngredients((p) =>
                p.map((x, i) => (i === idx ? { ...x, objectId: e.target.value } : x)),
              )
            }
          >
            {objects.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
          <input
            type="number"
            step="0.01"
            className="w-20 rounded-xl border border-boat-100 px-2 py-2"
            value={ing.quantityPerPerson}
            onChange={(e) =>
              setIngredients((p) =>
                p.map((x, i) =>
                  i === idx ? { ...x, quantityPerPerson: parseFloat(e.target.value) || 0 } : x,
                ),
              )
            }
          />
          <button
            type="button"
            onClick={() => setIngredients((p) => p.filter((_, i) => i !== idx))}
            aria-label="Treure ingredient"
            className="text-red-500"
          >
            <X size={20} />
          </button>
        </div>
      ))}
      <button type="button" onClick={addIngredient} className="self-start text-sm text-boat-600">
        + Afegir ingredient
      </button>

      <label className="text-sm font-medium text-boat-700">Temps (min, opcional)</label>
      <input
        type="number"
        className={field}
        value={prepTime}
        onChange={(e) => setPrepTime(parseInt(e.target.value, 10) || 0)}
      />

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={needsCooking} onChange={(e) => setNeedsCooking(e.target.checked)} />
        <span className="flex items-center gap-1">
          Cal foc <Flame size={16} className="text-red-500" />
        </span>
      </label>

      <label className="text-sm font-medium text-boat-700">Passos (un per línia, opcional)</label>
      <textarea
        className={field}
        rows={4}
        value={stepsText}
        onChange={(e) => setStepsText(e.target.value)}
      />

      <div className="mt-2 flex gap-2">
        <Button variant="secondary" onClick={onCancel}>Cancel·lar</Button>
        <Button onClick={submit}>Desar</Button>
      </div>
    </div>
  );
}
