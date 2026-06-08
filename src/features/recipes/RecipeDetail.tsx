import { useState } from 'react';
import type { ItemObject, Recipe } from '@/types/entities';
import { Sheet } from '@/components/ui/Sheet';
import { ChefHat, Flame } from '@/components/ui/icons';
import { ObjectIcon } from '@/components/ui/ObjectIcon';
import { useObjectsMap } from '@/hooks/useData';
import { CookRecipePanel } from '@/features/cook/CookRecipePanel';
import { ObjectDetail } from '@/features/objects/ObjectDetail';
import { t } from '@/text';

/**
 * Panell de detall d'una recepta: ingredients, temps i passos, amb un botó per cuinar
 * que obre directament la selecció de comensals. Reutilitzat des de la llista de
 * receptes i des del detall d'un objecte.
 */
export function RecipeDetail({
  recipe,
  onCooked,
}: {
  recipe: Recipe;
  onCooked?: () => void;
}) {
  const objectsMap = useObjectsMap();
  const [cooking, setCooking] = useState(false);
  const [ingredientObj, setIngredientObj] = useState<ItemObject | null>(null);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="min-w-0 truncate text-xl font-bold text-boat-900">{recipe.title}</h2>
        <button
          onClick={() => setCooking(true)}
          className="flex flex-shrink-0 items-center gap-1 rounded-xl bg-boat-700 px-3 py-2 text-sm font-semibold text-white active:scale-95"
        >
          <ChefHat size={16} /> {t.recipeDetail.cook}
        </button>
      </div>

      <div className="flex flex-wrap gap-2 text-xs text-boat-600">
        {recipe.needsCooking && (
          <span className="flex items-center gap-1">
            <Flame size={14} className="text-red-500" /> {t.recipeDetail.needsFire}
          </span>
        )}
        {recipe.prepTimeMinutes ? <span>{t.recipeDetail.prepTimeLabel(recipe.prepTimeMinutes)}</span> : null}
      </div>

      <div>
        <h3 className="mb-1 text-sm font-semibold text-boat-700">{t.recipeDetail.ingredientsPerPerson}</h3>
        <ul className="flex flex-col gap-1 text-sm">
          {recipe.ingredients.map((ing) => {
            const obj = objectsMap.get(ing.objectId);
            const content = (
              <>
                <span className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center">
                    <ObjectIcon icon={obj?.icon} size={16} className="text-boat-400" />
                  </span>
                  <span>{obj?.name ?? t.recipeDetail.deletedObject}</span>
                </span>
                <span className="text-boat-500">{ing.quantityPerPerson}</span>
              </>
            );
            return (
              <li key={ing.objectId}>
                {obj ? (
                  <button
                    onClick={() => setIngredientObj(obj)}
                    className="flex w-full items-center justify-between active:scale-[0.98]"
                  >
                    {content}
                  </button>
                ) : (
                  <div className="flex items-center justify-between">{content}</div>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {recipe.steps && recipe.steps.length > 0 && (
        <div>
          <h3 className="mb-1 text-sm font-semibold text-boat-700">{t.recipeDetail.steps}</h3>
          <ol className="flex list-decimal flex-col gap-1 pl-5 text-sm">
            {recipe.steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        </div>
      )}

      <Sheet open={cooking} onClose={() => setCooking(false)} title={t.recipeDetail.cookTitle(recipe.title)}>
        <CookRecipePanel
          recipe={recipe}
          onDone={() => {
            setCooking(false);
            onCooked?.();
          }}
        />
      </Sheet>

      {/* Detall de l'ingredient (sense receptes per no anidar-ne més) */}
      <Sheet open={!!ingredientObj} onClose={() => setIngredientObj(null)}>
        {ingredientObj && (
          <ObjectDetail
            object={ingredientObj}
            hideRecipes
            onNavigate={() => setIngredientObj(null)}
          />
        )}
      </Sheet>
    </div>
  );
}
