import { useState } from 'react';
import type { ItemObject, Recipe } from '@/types/entities';
import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { NumberStepper } from '@/components/ui/common';
import { ObjectIcon } from '@/components/ui/ObjectIcon';
import { Archive, BookOpen, Flame, Minus, Pencil, Wrench } from '@/components/ui/icons';
import { useInventoryMap, useLocations } from '@/hooks/useData';
import { useRecipesWithObject } from '@/hooks/useRecipesWithObject';
import { RecipeDetail } from '@/features/recipes/RecipeDetail';
import { commitStockDelta } from '@/db/commands';
import { useAuth } from '@/auth/AuthProvider';
import { formatQuantity } from '@/lib/format';
import { nowISO, diffDays } from '@/lib/time';
import { t } from '@/text';

/**
 * Panell de detall d'un objecte: dades del material, llocs on es guarda i, si és menjar,
 * les receptes que el contenen. Un botó a la dreta del títol permet gastar-lo directament.
 * Els botons d'edició/ajust només apareixen si l'amfitrió en passa el callback (mode
 * "bloquejar edició").
 */
export function ObjectDetail({
  object,
  onEdit,
  onAdjust,
}: {
  object: ItemObject;
  onEdit?: () => void;
  onAdjust?: () => void;
}) {
  const { userName } = useAuth();
  const entry = useInventoryMap().get(object.id);
  const quantity = entry?.quantity ?? 0;
  const recipes = useRecipesWithObject(object.id);
  const locations = useLocations() ?? [];
  const now = nowISO();

  const [consuming, setConsuming] = useState(false);
  const [amount, setAmount] = useState(1);
  const [recipeDetail, setRecipeDetail] = useState<Recipe | null>(null);

  const here = locations.filter((l) => object.usualLocationIds.includes(l.id));

  const lots = (entry?.lots ?? [])
    .filter((l) => l.expiresAt)
    .sort((a, b) => (a.expiresAt! < b.expiresAt! ? -1 : 1));

  async function consume() {
    if (!userName) return;
    await commitStockDelta(userName, 'cooking', [{ objectId: object.id, delta: -amount }]);
    setConsuming(false);
    setAmount(1);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Capçalera amb botó gastar */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-boat-50">
            <ObjectIcon icon={object.icon} size={28} className="text-boat-700" />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-xl font-bold text-boat-900">{object.name}</h2>
            <p className="text-xs text-boat-500">
              {t.object.stockType[object.stockType]}
              {object.foodCategory ? ` · ${t.object.foodCategory[object.foodCategory] ?? object.foodCategory}` : ''}
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            setAmount(object.quantityType === 'units' ? 1 : 0.5);
            setConsuming(true);
          }}
          className="flex flex-shrink-0 items-center gap-1 self-center rounded-xl bg-boat-700 px-3 py-2 text-sm font-semibold text-white active:scale-95"
        >
          <Minus size={15} /> {t.object.spend}
        </button>
      </div>

      {/* Dades */}
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-xl bg-boat-50 p-3">
          <span className="block text-xs text-boat-500">{t.object.inStock}</span>
          <span className="text-lg font-bold text-boat-900">
            {formatQuantity(quantity, object.quantityType)}
          </span>
        </div>
        {object.foodCategory === 'water' && object.capacityLiters ? (
          <div className="rounded-xl bg-boat-50 p-3">
            <span className="block text-xs text-boat-500">{t.object.capacity}</span>
            <span className="text-lg font-bold text-boat-900">{object.capacityLiters} L</span>
          </div>
        ) : object.trackDuration ? (
          <div className="rounded-xl bg-boat-50 p-3">
            <span className="block text-xs text-boat-500">{t.object.tracking}</span>
            <span className="font-semibold text-boat-900">{t.object.durationOn}</span>
          </div>
        ) : null}
      </div>

      {/* Llocs on es guarda */}
      {here.length > 0 && (
        <div>
          <h3 className="mb-1 flex items-center gap-1 text-sm font-semibold text-boat-700">
            <Archive size={15} /> {t.object.storedAt}
          </h3>
          <div className="flex flex-wrap gap-2">
            {here.map((l) => (
              <span key={l.id} className="rounded-full bg-boat-100 px-3 py-1 text-sm text-boat-900">
                {l.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Lots de caducitat */}
      {lots.length > 0 && (
        <div>
          <h3 className="mb-1 text-sm font-semibold text-boat-700">{t.object.expiryByLots}</h3>
          <ul className="flex flex-col gap-1 text-sm">
            {lots.map((lot) => {
              const daysLeft = diffDays(now, lot.expiresAt!);
              return (
                <li key={lot.lotId} className="flex justify-between rounded-xl bg-boat-50 px-3 py-2">
                  <span>{formatQuantity(lot.quantity, object.quantityType)}</span>
                  <span
                    className={`font-semibold ${
                      daysLeft <= 1 ? 'text-red-600' : daysLeft <= 7 ? 'text-amber-600' : 'text-boat-500'
                    }`}
                  >
                    {daysLeft <= 0 ? t.object.expired : t.object.daysLeft(daysLeft)}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Receptes que el contenen (només menjar) */}
      {object.stockType === 'food' && (
        <div>
          <h3 className="mb-1 flex items-center gap-1 text-sm font-semibold text-boat-700">
            <BookOpen size={15} /> {t.object.recipesWithIngredient}
          </h3>
          {recipes.length === 0 ? (
            <p className="text-sm text-boat-400">{t.object.noRecipeUses}</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {recipes.map((r) => (
                <li key={r.id}>
                  <button
                    onClick={() => setRecipeDetail(r)}
                    className="flex w-full items-center justify-between rounded-xl bg-white p-3 shadow-sm active:scale-[0.98]"
                  >
                    <span className="flex items-center gap-2 font-semibold">
                      {r.needsCooking && <Flame size={14} className="text-red-500" />}
                      {r.title}
                    </span>
                    <span className="text-xs text-boat-500">{t.common.seeArrow}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Accions contextuals */}
      {(onAdjust || onEdit) && (
        <div className="flex flex-col gap-2">
          {onAdjust && (
            <Button variant="secondary" onClick={onAdjust}>
              <span className="flex items-center justify-center gap-2">
                <Wrench size={16} /> {t.object.adjustStock}
              </span>
            </Button>
          )}
          {onEdit && (
            <Button variant="secondary" onClick={onEdit}>
              <span className="flex items-center justify-center gap-2">
                <Pencil size={16} /> {t.object.editObject}
              </span>
            </Button>
          )}
        </div>
      )}

      {/* Full de gastar */}
      <Sheet open={consuming} onClose={() => setConsuming(false)} title={t.object.spendTitle(object.name)}>
        <div className="flex flex-col items-center gap-4">
          <p className="text-sm text-boat-500">
            {t.object.inStockLabel(formatQuantity(quantity, object.quantityType))}
          </p>
          <NumberStepper
            value={amount}
            onChange={setAmount}
            min={object.quantityType === 'units' ? 1 : 0.1}
            step={object.quantityType === 'units' ? 1 : 0.1}
          />
          <Button onClick={() => void consume()}>{t.object.confirmConsume}</Button>
        </div>
      </Sheet>

      {/* Detall de recepta */}
      <Sheet open={!!recipeDetail} onClose={() => setRecipeDetail(null)}>
        {recipeDetail && <RecipeDetail recipe={recipeDetail} onCooked={() => setRecipeDetail(null)} />}
      </Sheet>
    </div>
  );
}
