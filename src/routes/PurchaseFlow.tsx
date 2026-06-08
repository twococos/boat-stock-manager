import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ItemObject, Recipe } from '@/types/entities';
import { Sheet } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import { NumberStepper, EmptyState, TileButton } from '@/components/ui/common';
import { Package, BookOpen, ClipboardList } from '@/components/ui/icons';
import { ObjectIcon } from '@/components/ui/ObjectIcon';
import { useObjects, useRecipes, useObjectsMap } from '@/hooks/useData';
import { recipeToPurchaseLines } from '@/domain/recipes/scaling';
import { commitStockDelta } from '@/db/commands';
import { useAuth } from '@/auth/AuthProvider';
import { getDefaultDiners } from '@/auth/session';
import { t } from '@/text';

type Mode = 'menu' | 'object' | 'recipe';

/**
 * Mode COMPRA: vas afegint receptes i ingredients; després de CADA afegit es torna al
 * menú de selecció (no a la portada) per afegir el següent. Afegir una recepta sencera
 * suma tots els seus ingredients (escalats). PLA.md secció 12.3.
 */
export function PurchaseFlow() {
  const { userName } = useAuth();
  const navigate = useNavigate();
  const objects = useObjects() ?? [];
  const recipes = useRecipes() ?? [];
  const objectsMap = useObjectsMap();
  const [mode, setMode] = useState<Mode>('menu');
  const [addedCount, setAddedCount] = useState(0);

  // Full d'afegir un objecte
  const [obj, setObj] = useState<ItemObject | null>(null);
  const [objQty, setObjQty] = useState(1);
  const [expiresAt, setExpiresAt] = useState('');

  // Full d'afegir una recepta
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [diners, setDiners] = useState(getDefaultDiners());

  const [query, setQuery] = useState('');
  const filtered = useMemo(
    () => objects.filter((o) => o.name.toLowerCase().includes(query.toLowerCase())),
    [objects, query],
  );

  async function addObject() {
    if (!obj || !userName) return;
    await commitStockDelta(userName, 'purchase', [
      {
        objectId: obj.id,
        delta: objQty,
        ...(expiresAt ? { expiresAt: new Date(expiresAt).toISOString() } : {}),
      },
    ]);
    setObj(null);
    setExpiresAt('');
    setAddedCount((c) => c + 1);
    setMode('menu'); // torna al menú per al següent
  }

  async function addRecipe() {
    if (!recipe || !userName) return;
    const lines = recipeToPurchaseLines(recipe, diners, objectsMap);
    await commitStockDelta(userName, 'purchase', lines, {
      recipeId: recipe.id,
      diners,
    });
    setRecipe(null);
    setAddedCount((c) => c + 1);
    setMode('menu');
  }

  const needsExpiryInput = obj?.expiry?.mode === 'define_on_add';

  if (mode === 'menu') {
    return (
      <div className="flex flex-1 flex-col gap-4 pt-2">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">{t.purchase.title}</h1>
          {addedCount > 0 && (
            <span className="rounded-full bg-green-100 px-3 py-1 text-sm text-green-800">
              {t.purchase.addedCount(addedCount)}
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <TileButton icon={Package} label={t.purchase.ingredient} onClick={() => setMode('object')} className="bg-boat-500 text-white" />
          <TileButton icon={BookOpen} label={t.purchase.recipe} onClick={() => setMode('recipe')} className="bg-boat-700 text-white" />
        </div>
        <Button variant="secondary" onClick={() => navigate('/')}>
          {t.purchase.finish}
        </Button>
        {/* A baix de tot, contra la barra de navegació: separat de les opcions d'afegir estoc. */}
        <Button
          onClick={() => navigate('/shopping')}
          className="mt-auto flex items-center justify-center gap-2"
        >
          <ClipboardList size={20} />
          {t.shopping.openList}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 pt-2">
      <button onClick={() => setMode('menu')} className="self-start text-sm text-boat-600">
        {t.purchase.backToMenu}
      </button>

      {mode === 'object' ? (
        <>
          <h1 className="text-xl font-bold">{t.purchase.addIngredient}</h1>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.common.search}
            className="rounded-xl border border-boat-100 px-4 py-3"
          />
          {filtered.length === 0 ? (
            <EmptyState text={t.purchase.noObjects} />
          ) : (
            <ul className="flex flex-col gap-2">
              {filtered.map((o) => (
                <li key={o.id}>
                  <button
                    onClick={() => {
                      setObj(o);
                      setObjQty(o.quantityType === 'units' ? 1 : 1);
                    }}
                    className="flex w-full items-center gap-2 rounded-2xl bg-white p-3 shadow-sm active:scale-[0.98]"
                  >
                    <span className="flex h-8 w-8 items-center justify-center">
                      <ObjectIcon icon={o.icon} size={24} />
                    </span>
                    <span className="font-semibold">{o.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <>
          <h1 className="text-xl font-bold">{t.purchase.addRecipe}</h1>
          {recipes.length === 0 ? (
            <EmptyState icon={BookOpen} text={t.purchase.noRecipes} />
          ) : (
            <ul className="flex flex-col gap-2">
              {recipes.map((r) => (
                <li key={r.id}>
                  <button
                    onClick={() => {
                      setRecipe(r);
                      setDiners(getDefaultDiners());
                    }}
                    className="flex w-full items-center justify-between rounded-2xl bg-white p-3 shadow-sm active:scale-[0.98]"
                  >
                    <span className="font-semibold">{r.title}</span>
                    <span className="text-xs text-boat-500">{t.purchase.ingredientsCount(r.ingredients.length)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {/* Full afegir objecte */}
      <Sheet open={!!obj} onClose={() => setObj(null)} title={obj ? t.purchase.addObjectTitle(obj.name) : ''}>
        {obj && (
          <div className="flex flex-col items-center gap-4">
            <NumberStepper
              value={objQty}
              onChange={setObjQty}
              min={obj.quantityType === 'units' ? 1 : 0.1}
              step={obj.quantityType === 'units' ? 1 : 0.1}
            />
            {needsExpiryInput && (
              <label className="flex w-full flex-col gap-1 text-sm">
                {t.purchase.expiryDate}
                <input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="rounded-xl border border-boat-100 px-4 py-3"
                />
              </label>
            )}
            <Button onClick={() => void addObject()}>{t.purchase.addToStock}</Button>
          </div>
        )}
      </Sheet>

      {/* Full afegir recepta */}
      <Sheet open={!!recipe} onClose={() => setRecipe(null)} title={recipe?.title}>
        {recipe && (
          <div className="flex flex-col items-center gap-4">
            <span className="text-sm text-boat-500">{t.purchase.howManyPeople}</span>
            <NumberStepper value={diners} onChange={setDiners} min={1} />
            <Button onClick={() => void addRecipe()}>{t.purchase.addIngredients}</Button>
          </div>
        )}
      </Sheet>
    </div>
  );
}
