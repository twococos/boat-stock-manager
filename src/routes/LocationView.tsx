import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { ItemObject, StowageLocation } from '@/types/entities';
import { Sheet } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import { NumberStepper, EmptyState } from '@/components/ui/common';
import { Archive, Package, Pencil } from '@/components/ui/icons';
import { ConfirmDelete } from '@/components/ui/ConfirmDelete';
import { LocationForm } from '@/features/locations/LocationForm';
import { useObjects, useLocations, useInventoryMap } from '@/hooks/useData';
import { formatQuantity } from '@/lib/format';
import {
  commitStockDelta,
  commitLocationUpsert,
  commitLocationDelete,
} from '@/db/commands';
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
  const [editing, setEditing] = useState(false);

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

  async function saveLocation(l: StowageLocation) {
    if (!userName) return;
    await commitLocationUpsert(userName, l);
    setEditing(false);
  }

  async function removeLocation() {
    if (!location || !userName) return;
    await commitLocationDelete(userName, location.id);
    navigate('/locations');
  }

  if (!location) {
    return <EmptyState text="Lloc no trobat." />;
  }

  return (
    <div className="flex flex-col gap-3 pt-2">
      <button onClick={() => navigate('/locations')} className="self-start text-sm text-boat-600">
        ← Llocs
      </button>
      <div className="flex items-center justify-between gap-2">
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <Archive size={22} className="text-boat-700" />
          {location.name}
        </h1>
        <button
          onClick={() => setEditing(true)}
          className="flex items-center gap-1 text-sm text-boat-600"
        >
          <Pencil size={16} />
          Editar
        </button>
      </div>
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
                    <span className="flex h-8 w-8 items-center justify-center text-2xl">
                      {o.icon ?? <Package size={22} className="text-boat-500" />}
                    </span>
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

      <Sheet open={editing} onClose={() => setEditing(false)} title="Editar lloc">
        <div className="flex flex-col gap-4">
          <LocationForm
            initial={location}
            onSave={saveLocation}
            onCancel={() => setEditing(false)}
          />
          <ConfirmDelete
            message={`Eliminar "${location.name}"? Desapareixerà dels objectes que el tenien com a ubicació habitual.`}
            onConfirm={removeLocation}
          />
        </div>
      </Sheet>
    </div>
  );
}
