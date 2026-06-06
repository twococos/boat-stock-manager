import { useState } from 'react';
import type {
  ExpiryPolicy,
  FoodCategory,
  ItemObject,
  QuantityType,
  StockType,
} from '@/types/entities';
import { Button } from '@/components/ui/Button';
import { useLocations } from '@/hooks/useData';
import { newId } from '@/lib/id';
import { nowISO } from '@/lib/time';

const STOCK_TYPES: { value: StockType; label: string }[] = [
  { value: 'food', label: 'Menjar' },
  { value: 'consumable', label: 'Fungible' },
  { value: 'tools', label: 'Eines' },
  { value: 'other', label: 'Altres' },
];

const FOOD_CATEGORIES: { value: FoodCategory; label: string }[] = [
  { value: 'fridge', label: 'Nevera' },
  { value: 'snacks', label: 'Per picar' },
  { value: 'canned', label: 'Conserves' },
  { value: 'fruit', label: 'Fruita' },
  { value: 'vegetables', label: 'Verdures' },
  { value: 'breakfast', label: 'Esmorzar' },
  { value: 'dessert', label: 'Postres' },
  { value: 'water', label: 'Aigua' },
  { value: 'other', label: 'Altres' },
];

type ExpiryMode = 'never' | 'days_from_purchase' | 'define_on_add';

/** Formulari de creació/edició d'un objecte del catàleg. PLA.md secció 12.5. */
export function ObjectForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: ItemObject;
  onSave: (obj: ItemObject) => void;
  onCancel: () => void;
}) {
  const locations = useLocations() ?? [];
  const [name, setName] = useState(initial?.name ?? '');
  const [icon, setIcon] = useState(initial?.icon ?? '');
  const [stockType, setStockType] = useState<StockType>(initial?.stockType ?? 'food');
  const [quantityType, setQuantityType] = useState<QuantityType>(
    initial?.quantityType ?? 'units',
  );
  const [foodCategory, setFoodCategory] = useState<FoodCategory>(
    initial?.foodCategory ?? 'other',
  );
  const [trackDuration, setTrackDuration] = useState(initial?.trackDuration ?? false);
  const [expiryMode, setExpiryMode] = useState<ExpiryMode>(
    initial?.expiry?.mode ?? 'never',
  );
  const [expiryDays, setExpiryDays] = useState(
    initial?.expiry?.mode === 'days_from_purchase' ? initial.expiry.days : 30,
  );
  const [locIds, setLocIds] = useState<string[]>(initial?.usualLocationIds ?? []);

  const isFood = stockType === 'food';

  function buildExpiry(): ExpiryPolicy | undefined {
    if (!isFood) return undefined;
    if (expiryMode === 'never') return { mode: 'never' };
    if (expiryMode === 'days_from_purchase')
      return { mode: 'days_from_purchase', days: expiryDays };
    return { mode: 'define_on_add' };
  }

  function submit() {
    if (!name.trim()) return;
    const now = nowISO();
    const obj: ItemObject = {
      id: initial?.id ?? newId(),
      name: name.trim(),
      icon: icon.trim() || undefined,
      stockType,
      quantityType,
      usualLocationIds: locIds,
      foodCategory: isFood ? foodCategory : undefined,
      expiry: buildExpiry(),
      trackDuration,
      createdAt: initial?.createdAt ?? now,
      updatedAt: now,
    };
    onSave(obj);
  }

  const field = 'rounded-xl border border-boat-100 px-4 py-3 w-full';

  return (
    <div className="flex flex-col gap-3">
      <input className={field} placeholder="Nom" value={name} onChange={(e) => setName(e.target.value)} />
      <input className={field} placeholder="Icona (emoji)" value={icon} onChange={(e) => setIcon(e.target.value)} />

      <label className="text-sm font-medium text-boat-700">Tipus</label>
      <select className={field} value={stockType} onChange={(e) => setStockType(e.target.value as StockType)}>
        {STOCK_TYPES.map((t) => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </select>

      <label className="text-sm font-medium text-boat-700">Unitat de quantitat</label>
      <select className={field} value={quantityType} onChange={(e) => setQuantityType(e.target.value as QuantityType)}>
        <option value="units">Unitats</option>
        <option value="kg">Quilos (kg)</option>
        <option value="L">Litres (L)</option>
      </select>

      {isFood && (
        <>
          <label className="text-sm font-medium text-boat-700">Categoria de menjar</label>
          <select className={field} value={foodCategory} onChange={(e) => setFoodCategory(e.target.value as FoodCategory)}>
            {FOOD_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>

          <label className="text-sm font-medium text-boat-700">Caducitat</label>
          <select className={field} value={expiryMode} onChange={(e) => setExpiryMode(e.target.value as ExpiryMode)}>
            <option value="never">No caduca</option>
            <option value="days_from_purchase">Dies des de la compra</option>
            <option value="define_on_add">Definir en afegir</option>
          </select>
          {expiryMode === 'days_from_purchase' && (
            <input
              type="number"
              className={field}
              value={expiryDays}
              onChange={(e) => setExpiryDays(parseInt(e.target.value, 10) || 0)}
              placeholder="Dies"
            />
          )}
        </>
      )}

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={trackDuration}
          onChange={(e) => setTrackDuration(e.target.checked)}
        />
        Mostrar estimació de durada (aigua, gas…)
      </label>

      <label className="text-sm font-medium text-boat-700">Llocs habituals</label>
      <div className="flex flex-wrap gap-2">
        {locations.map((l) => {
          const active = locIds.includes(l.id);
          return (
            <button
              key={l.id}
              type="button"
              onClick={() =>
                setLocIds((prev) =>
                  active ? prev.filter((x) => x !== l.id) : [...prev, l.id],
                )
              }
              className={`rounded-full px-3 py-1 text-sm ${
                active ? 'bg-boat-700 text-white' : 'bg-boat-100 text-boat-900'
              }`}
            >
              {l.name}
            </button>
          );
        })}
      </div>

      <div className="mt-2 flex gap-2">
        <Button variant="secondary" onClick={onCancel}>Cancel·lar</Button>
        <Button onClick={submit}>Desar</Button>
      </div>
    </div>
  );
}
