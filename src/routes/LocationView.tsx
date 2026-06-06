import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { ItemObject } from '@/types/entities';
import { Sheet } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import { NumberStepper, EmptyState } from '@/components/ui/common';
import { useObjects, useLocations, useInventoryMap } from '@/hooks/useData';
import { formatQuantity } from '@/lib/format';
import { commitStockDelta } from '@/db/commands';
import { useAuth } from '@/auth/AuthProvider';

/**
 * Vista d'un compartiment: mostra els objectes que hi van guardats i permet corregir
 * l'estoc (afegir/treure el que falti/sobri) → genera esdeveniments d'ajust.
 * PLA.md secció 12.4.
 */
export function LocationView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userName } = useAuth();
  const objects = useObjects() ?? [];
  const locations = useLocations() ?? [];
  const invMap = useInventoryMap();

  const location = locations.find((l) => l.id === id);
  const [adjusting, setAdjusting] = useState<ItemObject | null>(null);
  const [newQty, setNewQty] = useState(0);

  const here = useMemo(
    () => objects.filter((o) => o.usualLocationIds.includes(id ?? '')),
    [objects, id],
  );

  async function confirmAdjust() {
    if (!adjusting || !userName) return;
    const current = invMap.get(adjusting.id)?.quantity ?? 0;
    const delta = newQty - current;
    if (delta !== 0) {
      await commitStockDelta(userName, 'adjustment', [
        { objectId: adjusting.id, delta },
      ]);
    }
    setAdjusting(null);
  }

  if (!location) {
    return <EmptyState text="Lloc no trobat." />;
  }

  return (
    <div className="flex flex-col gap-3 pt-2">
      <button onClick={() => navigate('/locations')} className="self-start text-sm text-boat-600">
        ← Llocs
      </button>
      <h1 className="text-xl font-bold">🗄️ {location.name}</h1>
      {location.description && (
        <p className="text-sm text-boat-500">{location.description}</p>
      )}

      {here.length === 0 ? (
        <EmptyState text="Cap objecte assignat a aquest lloc." />
      ) : (
        <ul className="flex flex-col gap-2">
          {here.map((o) => {
            const qty = invMap.get(o.id)?.quantity ?? 0;
            return (
              <li key={o.id}>
                <button
                  onClick={() => {
                    setAdjusting(o);
                    setNewQty(qty);
                  }}
                  className="flex w-full items-center justify-between rounded-2xl bg-white p-3 shadow-sm active:scale-[0.98]"
                >
                  <span className="flex items-center gap-2">
                    <span className="text-2xl">{o.icon ?? '📦'}</span>
                    <span className="font-semibold">{o.name}</span>
                  </span>
                  <span className="text-sm text-boat-500">
                    {formatQuantity(qty, o.quantityType)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <Sheet
        open={!!adjusting}
        onClose={() => setAdjusting(null)}
        title={adjusting ? `Ajustar ${adjusting.name}` : ''}
      >
        {adjusting && (
          <div className="flex flex-col items-center gap-4">
            <p className="text-sm text-boat-500">Quantitat real al compartiment:</p>
            <NumberStepper
              value={newQty}
              onChange={setNewQty}
              min={0}
              step={adjusting.quantityType === 'units' ? 1 : 0.1}
            />
            <Button onClick={() => void confirmAdjust()}>Desar ajust</Button>
          </div>
        )}
      </Sheet>
    </div>
  );
}
