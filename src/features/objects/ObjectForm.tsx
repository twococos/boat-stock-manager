import { useState } from 'react';
import type {
  ExpiryPolicy,
  FoodCategory,
  ItemObject,
  QuantityType,
  StockType,
} from '@/types/entities';
import { Button } from '@/components/ui/Button';
import { IconPicker } from '@/components/ui/IconPicker';
import { useLocations } from '@/hooks/useData';
import { newId } from '@/lib/id';
import { nowISO } from '@/lib/time';
import { t } from '@/text';

const STOCK_TYPES: { value: StockType; label: string }[] = [
  { value: 'food', label: t.objectForm.stockTypeOptions.food },
  { value: 'consumable', label: t.objectForm.stockTypeOptions.consumable },
  { value: 'tools', label: t.objectForm.stockTypeOptions.tools },
  { value: 'other', label: t.objectForm.stockTypeOptions.other },
];

const FOOD_CATEGORIES: { value: FoodCategory; label: string }[] = [
  { value: 'fridge', label: t.objectForm.foodCategoryOptions.fridge },
  { value: 'snacks', label: t.objectForm.foodCategoryOptions.snacks },
  { value: 'canned', label: t.objectForm.foodCategoryOptions.canned },
  { value: 'fruit', label: t.objectForm.foodCategoryOptions.fruit },
  { value: 'vegetables', label: t.objectForm.foodCategoryOptions.vegetables },
  { value: 'breakfast', label: t.objectForm.foodCategoryOptions.breakfast },
  { value: 'dessert', label: t.objectForm.foodCategoryOptions.dessert },
  { value: 'water', label: t.objectForm.foodCategoryOptions.water },
  { value: 'other', label: t.objectForm.foodCategoryOptions.other },
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
  const [capacityLiters, setCapacityLiters] = useState(initial?.capacityLiters ?? 5);
  const [locIds, setLocIds] = useState<string[]>(initial?.usualLocationIds ?? []);

  const isFood = stockType === 'food';
  // L'aigua és un cas especial: es compta en unitats (ampolles), no caduca, no té
  // estimació de durada pròpia (s'agrega al dashboard) i en canvi té capacitat en litres.
  const isWater = isFood && foodCategory === 'water';

  function buildExpiry(): ExpiryPolicy | undefined {
    if (!isFood) return undefined;
    if (isWater) return { mode: 'never' };
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
      quantityType: isWater ? 'units' : quantityType,
      usualLocationIds: locIds,
      foodCategory: isFood ? foodCategory : undefined,
      expiry: buildExpiry(),
      trackDuration: isWater ? false : trackDuration,
      capacityLiters: isWater ? capacityLiters : undefined,
      createdAt: initial?.createdAt ?? now,
      updatedAt: now,
    };
    onSave(obj);
  }

  const field = 'rounded-xl border border-boat-100 px-4 py-3 w-full';

  return (
    <div className="flex flex-col gap-3">
      <input className={field} placeholder={t.objectForm.name} value={name} onChange={(e) => setName(e.target.value)} />

      <label className="text-sm font-medium text-boat-700">{t.objectForm.icon}</label>
      <IconPicker value={icon} onChange={setIcon} />

      <label className="text-sm font-medium text-boat-700">{t.objectForm.type}</label>
      <select className={field} value={stockType} onChange={(e) => setStockType(e.target.value as StockType)}>
        {STOCK_TYPES.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>

      {!isWater && (
        <>
          <label className="text-sm font-medium text-boat-700">{t.objectForm.quantityUnit}</label>
          <select className={field} value={quantityType} onChange={(e) => setQuantityType(e.target.value as QuantityType)}>
            <option value="units">{t.objectForm.units}</option>
            <option value="kg">{t.objectForm.kg}</option>
            <option value="L">{t.objectForm.liters}</option>
          </select>
        </>
      )}

      {isFood && (
        <>
          <label className="text-sm font-medium text-boat-700">{t.objectForm.foodCategory}</label>
          <select className={field} value={foodCategory} onChange={(e) => setFoodCategory(e.target.value as FoodCategory)}>
            {FOOD_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </>
      )}

      {isWater && (
        <>
          <label className="text-sm font-medium text-boat-700">{t.objectForm.bottleCapacity}</label>
          <input
            type="number"
            step="0.1"
            min="0"
            className={field}
            value={capacityLiters}
            onChange={(e) => setCapacityLiters(parseFloat(e.target.value) || 0)}
            placeholder={t.objectForm.bottleCapacityPlaceholder}
          />
          <p className="text-xs text-boat-500">
            {t.objectForm.waterHint}
          </p>
        </>
      )}

      {isFood && !isWater && (
        <>
          <label className="text-sm font-medium text-boat-700">{t.objectForm.expiry}</label>
          <select className={field} value={expiryMode} onChange={(e) => setExpiryMode(e.target.value as ExpiryMode)}>
            <option value="never">{t.objectForm.expiryNever}</option>
            <option value="days_from_purchase">{t.objectForm.expiryDaysFromPurchase}</option>
            <option value="define_on_add">{t.objectForm.expiryDefineOnAdd}</option>
          </select>
          {expiryMode === 'days_from_purchase' && (
            <input
              type="number"
              className={field}
              value={expiryDays}
              onChange={(e) => setExpiryDays(parseInt(e.target.value, 10) || 0)}
              placeholder={t.objectForm.daysPlaceholder}
            />
          )}
        </>
      )}

      {!isWater && (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={trackDuration}
            onChange={(e) => setTrackDuration(e.target.checked)}
          />
          {t.objectForm.trackDuration}
        </label>
      )}

      <label className="text-sm font-medium text-boat-700">{t.objectForm.usualLocations}</label>
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
        <Button variant="secondary" onClick={onCancel}>{t.common.cancel}</Button>
        <Button onClick={submit}>{t.common.save}</Button>
      </div>
    </div>
  );
}
