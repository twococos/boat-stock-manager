import { useExpiring } from '@/hooks/useDerived';
import { EmptyState, Card } from '@/components/ui/common';
import { Salad, Utensils } from '@/components/ui/icons';
import { formatQuantity } from '@/lib/format';

/** Llista d'objectes que caduquen aviat (per lots). PLA.md secció 8.3 / 12.1. */
export function Expiring() {
  const expiring = useExpiring(30);

  return (
    <div className="flex flex-col gap-3 pt-2">
      <h1 className="text-xl font-bold">Caduca aviat</h1>
      {expiring.length === 0 ? (
        <EmptyState icon={Salad} text="Res caduca en els pròxims 30 dies." />
      ) : (
        <ul className="flex flex-col gap-2">
          {expiring.map((e) => (
            <li key={e.object.id}>
              <Card className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center text-2xl">
                    {e.object.icon ?? <Utensils size={22} className="text-boat-500" />}
                  </span>
                  <span>
                    <span className="block font-semibold">{e.object.name}</span>
                    <span className="block text-xs text-boat-500">
                      {formatQuantity(e.entry.quantity, e.object.quantityType)} en estoc
                    </span>
                  </span>
                </span>
                <span
                  className={`text-sm font-bold ${
                    e.daysLeft <= 1 ? 'text-red-600' : 'text-amber-600'
                  }`}
                >
                  {e.daysLeft <= 0 ? 'caducat' : `${Math.ceil(e.daysLeft)} dies`}
                </span>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
