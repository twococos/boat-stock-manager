import { useMemo, useState } from 'react';
import type { Recipe } from '@/types/entities';
import { Sheet } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import { NumberStepper, EmptyState } from '@/components/ui/common';
import { Flame, AlertTriangle, Package, BookOpen } from '@/components/ui/icons';
import { useObjectsMap, useInventoryMap, useRecipes } from '@/hooks/useData';
import { scaleRecipe } from '@/domain/recipes/scaling';
import { recipeToCookLines } from '@/domain/recipes/scaling';
import { formatQuantity } from '@/lib/format';
import { commitStockDelta } from '@/db/commands';
import { useAuth } from '@/auth/AuthProvider';
import { getDefaultDiners } from '@/auth/session';

/**
 * Cuinar una recepta: tria recepta + comensals; els ingredients sense estoc suficient
 * surten en VERMELL; en confirmar, alerta; si es cuina, l'estoc va a 0 (mai negatiu).
 * PLA.md secció 12.2.
 */
export function CookRecipe({ onDone }: { onDone: () => void }) {
  const { userName } = useAuth();
  const recipes = useRecipes();
  const objectsMap = useObjectsMap();
  const invMap = useInventoryMap();
  const [selected, setSelected] = useState<Recipe | null>(null);
  const [diners, setDiners] = useState(getDefaultDiners());

  const scaled = useMemo(
    () => (selected ? scaleRecipe(selected, diners, objectsMap) : []),
    [selected, diners, objectsMap],
  );

  const anyShort = scaled.some(
    (s) => (invMap.get(s.objectId)?.quantity ?? 0) < s.quantity,
  );

  async function confirm() {
    if (!selected || !userName) return;
    if (anyShort) {
      const ok = window.confirm(
        'Falta estoc d\'alguns ingredients. Si cuines igualment, el seu estoc quedarà a 0. Continuar?',
      );
      if (!ok) return;
    }
    const lines = recipeToCookLines(selected, diners, objectsMap);
    await commitStockDelta(userName, 'cooking', lines, {
      recipeId: selected.id,
      diners,
    });
    setSelected(null);
    onDone();
  }

  if ((recipes ?? []).length === 0) {
    return <EmptyState icon={BookOpen} text="Encara no hi ha receptes. Crea'n una a Objectes → Receptes." />;
  }

  return (
    <>
      <ul className="flex flex-col gap-2">
        {(recipes ?? []).map((r) => (
          <li key={r.id}>
            <button
              onClick={() => {
                setSelected(r);
                setDiners(getDefaultDiners());
              }}
              className="flex w-full items-center justify-between rounded-2xl bg-white p-3 shadow-sm active:scale-[0.98]"
            >
              <span className="font-semibold">{r.title}</span>
              <span className="flex items-center gap-1 text-xs text-boat-500">
                {r.needsCooking && <Flame size={14} className="text-red-500" />}
                {r.ingredients.length} ingr.
              </span>
            </button>
          </li>
        ))}
      </ul>

      <Sheet
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.title}
      >
        {selected && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="font-medium text-boat-700">Comensals</span>
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
                        {obj?.icon ?? <Package size={16} className="text-boat-400" />}
                      </span>
                      <span>{obj?.name ?? s.objectId}</span>
                    </span>
                    <span
                      className={`text-sm font-semibold ${
                        short ? 'text-red-600' : 'text-boat-700'
                      }`}
                    >
                      {formatQuantity(s.quantity, s.quantityType)}
                      <span className="ml-1 text-xs font-normal text-boat-400">
                        (hi ha {formatQuantity(have, s.quantityType)})
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>

            {anyShort && (
              <p className="flex items-center gap-1.5 text-sm text-red-600">
                <AlertTriangle size={16} className="shrink-0" />
                Falta estoc d'alguns ingredients (en vermell).
              </p>
            )}

            <Button onClick={() => void confirm()}>Cuinar</Button>
          </div>
        )}
      </Sheet>
    </>
  );
}
