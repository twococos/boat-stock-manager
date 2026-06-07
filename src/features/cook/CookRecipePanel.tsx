import { useMemo, useState } from 'react';
import type { Recipe } from '@/types/entities';
import { Button } from '@/components/ui/Button';
import { NumberStepper } from '@/components/ui/common';
import { AlertTriangle } from '@/components/ui/icons';
import { ObjectIcon } from '@/components/ui/ObjectIcon';
import { useObjectsMap, useInventoryMap } from '@/hooks/useData';
import { scaleRecipe, recipeToCookLines } from '@/domain/recipes/scaling';
import { formatQuantity } from '@/lib/format';
import { commitStockDelta } from '@/db/commands';
import { useAuth } from '@/auth/AuthProvider';
import { getDefaultDiners } from '@/auth/session';
import { t } from '@/text';

/**
 * Panell per cuinar UNA recepta concreta: tria comensals, mostra els ingredients
 * escalats (en vermell si falta estoc) i confirma. En cuinar amb estoc insuficient,
 * l'estoc va a 0 (mai negatiu). Reutilitzable des del menú de cuina i des dels detalls.
 */
export function CookRecipePanel({
  recipe,
  onDone,
}: {
  recipe: Recipe;
  onDone: () => void;
}) {
  const { userName } = useAuth();
  const objectsMap = useObjectsMap();
  const invMap = useInventoryMap();
  const [diners, setDiners] = useState(getDefaultDiners());

  const scaled = useMemo(
    () => scaleRecipe(recipe, diners, objectsMap),
    [recipe, diners, objectsMap],
  );
  const anyShort = scaled.some(
    (s) => (invMap.get(s.objectId)?.quantity ?? 0) < s.quantity,
  );

  async function confirm() {
    if (!userName) return;
    if (anyShort) {
      const ok = window.confirm(t.cookPanel.confirmShort);
      if (!ok) return;
    }
    const lines = recipeToCookLines(recipe, diners, objectsMap);
    await commitStockDelta(userName, 'cooking', lines, {
      recipeId: recipe.id,
      diners,
    });
    onDone();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="font-medium text-boat-700">{t.cookPanel.diners}</span>
        <NumberStepper value={diners} onChange={setDiners} min={1} />
      </div>

      <ul className="flex flex-col gap-1">
        {scaled.map((s) => {
          const obj = objectsMap.get(s.objectId);
          const have = invMap.get(s.objectId)?.quantity ?? 0;
          const short = have < s.quantity;
          return (
            <li
              key={s.objectId}
              className={`flex items-center justify-between rounded-lg px-3 py-2 ${
                short ? 'bg-red-50' : 'bg-boat-50'
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center">
                  <ObjectIcon icon={obj?.icon} size={16} className="text-boat-400" />
                </span>
                <span>{obj?.name ?? s.objectId}</span>
              </span>
              <span
                className={`text-sm font-semibold ${short ? 'text-red-600' : 'text-boat-700'}`}
              >
                {formatQuantity(s.quantity, s.quantityType)}
                <span className="ml-1 text-xs font-normal text-boat-400">
                  {t.cookPanel.have(formatQuantity(have, s.quantityType))}
                </span>
              </span>
            </li>
          );
        })}
      </ul>

      {anyShort && (
        <p className="flex items-center gap-1.5 text-sm text-red-600">
          <AlertTriangle size={16} className="shrink-0" />
          {t.cookPanel.shortWarning}
        </p>
      )}

      <Button onClick={() => void confirm()}>{t.cookPanel.cook}</Button>
    </div>
  );
}
