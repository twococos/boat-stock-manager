import { useState } from 'react';
import type { ItemObject } from '@/types/entities';
import { Sheet } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import { NumberStepper, EmptyState } from '@/components/ui/common';
import { useInventoryMap } from '@/hooks/useData';
import { formatQuantity } from '@/lib/format';
import { commitStockDelta } from '@/db/commands';
import { useAuth } from '@/auth/AuthProvider';

/**
 * Consum ràpid: llista d'objectes; en triar-ne un, s'obre un full per restar quantitat.
 * Reutilitzat per Aigua / Picar / Postre / Esmorzar / Llista completa. L'estoc mai
 * queda negatiu (el domini satura a 0).
 */
export function QuickConsume({
  title,
  objects,
  onDone,
}: {
  title: string;
  objects: ItemObject[];
  onDone: () => void;
}) {
  const { userName } = useAuth();
  const invMap = useInventoryMap();
  const [selected, setSelected] = useState<ItemObject | null>(null);
  const [amount, setAmount] = useState(1);

  async function confirm() {
    if (!selected || !userName) return;
    await commitStockDelta(userName, 'cooking', [
      { objectId: selected.id, delta: -amount },
    ]);
    setSelected(null);
    setAmount(1);
    onDone();
  }

  if (objects.length === 0) {
    return <EmptyState text={`No hi ha objectes a "${title}".`} />;
  }

  return (
    <>
      <ul className="flex flex-col gap-2">
        {objects.map((o) => {
          const qty = invMap.get(o.id)?.quantity ?? 0;
          return (
            <li key={o.id}>
              <button
                onClick={() => {
                  setSelected(o);
                  setAmount(o.quantityType === 'units' ? 1 : 0.5);
                }}
                className="flex w-full items-center justify-between rounded-2xl bg-white p-3 shadow-sm active:scale-[0.98]"
              >
                <span className="flex items-center gap-2">
                  <span className="text-2xl">{o.icon ?? '📦'}</span>
                  <span className="font-semibold">{o.name}</span>
                </span>
                <span
                  className={`text-sm ${qty <= 0 ? 'text-red-500' : 'text-boat-500'}`}
                >
                  {formatQuantity(qty, o.quantityType)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <Sheet
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `Gastar ${selected.name}` : ''}
      >
        {selected && (
          <div className="flex flex-col items-center gap-4">
            <p className="text-sm text-boat-500">
              En estoc:{' '}
              {formatQuantity(
                invMap.get(selected.id)?.quantity ?? 0,
                selected.quantityType,
              )}
            </p>
            <NumberStepper
              value={amount}
              onChange={setAmount}
              min={selected.quantityType === 'units' ? 1 : 0.1}
              step={selected.quantityType === 'units' ? 1 : 0.1}
            />
            <Button onClick={() => void confirm()}>Confirmar consum</Button>
          </div>
        )}
      </Sheet>
    </>
  );
}
