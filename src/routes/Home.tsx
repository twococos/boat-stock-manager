import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/common';
import { ChefHat, ShoppingCart, Package, Utensils, ThumbsUp } from '@/components/ui/icons';
import { useDurations, useExpiring } from '@/hooks/useDerived';
import { formatQuantity } from '@/lib/format';

/** Dashboard / portada: centrat en el menjar (el més usat). PLA.md secció 12.1. */
export function Home() {
  const navigate = useNavigate();
  const durations = useDurations();
  const expiring = useExpiring(7);

  return (
    <div className="flex flex-col gap-5 pt-2">
      {/* Botons grans principals */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => navigate('/cook')}
          className="flex min-h-[7rem] flex-col items-center justify-center gap-1 rounded-3xl bg-boat-700 text-white shadow active:scale-95"
        >
          <ChefHat size={40} />
          <span className="text-lg font-bold">Cuinar</span>
        </button>
        <button
          onClick={() => navigate('/purchase')}
          className="flex min-h-[7rem] flex-col items-center justify-center gap-1 rounded-3xl bg-boat-500 text-white shadow active:scale-95"
        >
          <ShoppingCart size={40} />
          <span className="text-lg font-bold">Comprar</span>
        </button>
      </div>

      {/* Indicadors de durada (aigua, gas…) */}
      {durations.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-boat-700">Durada estimada</h2>
          {durations.map((d) => (
            <Card key={d.object.id} className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center text-2xl">
                  {d.object.icon ?? <Package size={22} className="text-boat-500" />}
                </span>
                <span>
                  <span className="font-semibold">{d.object.name}</span>
                  <span className="block text-xs text-boat-500">
                    {formatQuantity(d.quantity, d.object.quantityType)} en estoc
                  </span>
                </span>
              </span>
              <span className="text-right">
                {d.daysRemaining === null ? (
                  <span className="text-sm text-boat-400">sense consum</span>
                ) : (
                  <span className="text-lg font-bold text-boat-700">
                    ~{Math.floor(d.daysRemaining)} d
                  </span>
                )}
              </span>
            </Card>
          ))}
        </section>
      )}

      {/* Caduca aviat */}
      <section className="flex flex-col gap-2">
        <button
          onClick={() => navigate('/expiring')}
          className="flex items-center justify-between"
        >
          <h2 className="text-sm font-semibold text-boat-700">Caduca aviat</h2>
          <span className="text-xs text-boat-500">veure tot →</span>
        </button>
        {expiring.length === 0 ? (
          <Card className="flex items-center gap-2 text-sm text-boat-500">
            <ThumbsUp size={18} className="text-green-600" />
            Res caduca en 7 dies.
          </Card>
        ) : (
          expiring.slice(0, 3).map((e) => (
            <Card
              key={e.object.id}
              className="flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center text-2xl">
                  {e.object.icon ?? <Utensils size={22} className="text-boat-500" />}
                </span>
                <span className="font-semibold">{e.object.name}</span>
              </span>
              <span
                className={`text-sm font-bold ${
                  e.daysLeft <= 1 ? 'text-red-600' : 'text-amber-600'
                }`}
              >
                {e.daysLeft <= 0 ? 'caducat' : `${Math.ceil(e.daysLeft)} d`}
              </span>
            </Card>
          ))
        )}
      </section>
    </div>
  );
}
