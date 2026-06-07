import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { ItemObject, StowageLocation } from '@/types/entities';
import { Sheet } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import { NumberStepper, EmptyState } from '@/components/ui/common';
import { Archive, Pencil } from '@/components/ui/icons';
import { ObjectIcon } from '@/components/ui/ObjectIcon';
import { ConfirmDelete } from '@/components/ui/ConfirmDelete';
import { LocationForm } from '@/features/locations/LocationForm';
import { ObjectDetail } from '@/features/objects/ObjectDetail';
import { useObjects, useLocations, useInventoryMap } from '@/hooks/useData';
import { useLocationPhoto } from '@/hooks/useLocationPhoto';
import { formatQuantity } from '@/lib/format';
import {
  commitStockDelta,
  commitLocationUpsert,
  commitLocationDelete,
} from '@/db/commands';
import { useAuth } from '@/auth/AuthProvider';
import { useEditLocked } from '@/hooks/useEditLocked';
import { t } from '@/text';

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
  const editLocked = useEditLocked();

  const location = locations.find((l) => l.id === id);
  const photoUrl = useLocationPhoto(location?.photoPath);
  const [detail, setDetail] = useState<ItemObject | null>(null);
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
    return <EmptyState text={t.locationView.notFound} />;
  }

  return (
    <div className="flex flex-col gap-3 pt-2">
      <button onClick={() => navigate('/locations')} className="self-start text-sm text-boat-600">
        {t.locationView.back}
      </button>
      <div className="flex items-center justify-between gap-2">
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <Archive size={22} className="text-boat-700" />
          {location.name}
        </h1>
        {!editLocked && (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1 text-sm text-boat-600"
          >
            <Pencil size={16} />
            {t.locationView.edit}
          </button>
        )}
      </div>
      {location.description && (
        <p className="text-sm text-boat-500">{location.description}</p>
      )}

      {photoUrl && (
        <div className="overflow-hidden rounded-3xl shadow-sm">
          <img
            src={photoUrl}
            alt={t.locationView.photoAlt(location.name)}
            className="max-h-64 w-full object-cover"
          />
        </div>
      )}

      {here.length === 0 ? (
        <EmptyState text={t.locationView.noObjects} />
      ) : (
        <ul className="flex flex-col gap-2">
          {here.map((o) => {
            const qty = invMap.get(o.id)?.quantity ?? 0;
            return (
              <li key={o.id}>
                <button
                  onClick={() => setDetail(o)}
                  className="flex w-full items-center justify-between rounded-2xl bg-white p-3 shadow-sm active:scale-[0.98]"
                >
                  <span className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center">
                      <ObjectIcon icon={o.icon} size={24} />
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

      <Sheet open={!!detail} onClose={() => setDetail(null)}>
        {detail && (
          <ObjectDetail
            object={detail}
            onAdjust={() => {
              setNewQty(invMap.get(detail.id)?.quantity ?? 0);
              setAdjusting(detail);
              setDetail(null);
            }}
          />
        )}
      </Sheet>

      <Sheet
        open={!!adjusting}
        onClose={() => setAdjusting(null)}
        title={adjusting ? t.locationView.adjustTitle(adjusting.name) : ''}
      >
        {adjusting && (
          <div className="flex flex-col items-center gap-4">
            <p className="text-sm text-boat-500">{t.locationView.realQuantity}</p>
            <NumberStepper
              value={newQty}
              onChange={setNewQty}
              min={0}
              step={adjusting.quantityType === 'units' ? 1 : 0.1}
            />
            <Button onClick={() => void confirmAdjust()}>{t.locationView.saveAdjust}</Button>
          </div>
        )}
      </Sheet>

      <Sheet open={editing} onClose={() => setEditing(false)} title={t.locationView.editLocationTitle}>
        <div className="flex flex-col gap-4">
          <LocationForm
            initial={location}
            onSave={saveLocation}
            onCancel={() => setEditing(false)}
          />
          <ConfirmDelete
            message={t.locationView.confirmDelete(location.name)}
            onConfirm={removeLocation}
          />
        </div>
      </Sheet>
    </div>
  );
}
