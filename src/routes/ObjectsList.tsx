import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ItemObject } from '@/types/entities';
import { Sheet } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/common';
import { ObjectForm } from '@/features/objects/ObjectForm';
import { useObjects, useInventoryMap } from '@/hooks/useData';
import { commitObjectUpsert } from '@/db/commands';
import { useAuth } from '@/auth/AuthProvider';
import { formatQuantity } from '@/lib/format';

/** Catàleg d'objectes amb cerca i creació/edició. PLA.md secció 12.5. */
export function ObjectsList() {
  const { userName } = useAuth();
  const navigate = useNavigate();
  const objects = useObjects() ?? [];
  const invMap = useInventoryMap();
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<ItemObject | null>(null);
  const [creating, setCreating] = useState(false);

  const filtered = useMemo(
    () => objects.filter((o) => o.name.toLowerCase().includes(query.toLowerCase())),
    [objects, query],
  );

  async function save(obj: ItemObject) {
    if (!userName) return;
    await commitObjectUpsert(userName, obj);
    setEditing(null);
    setCreating(false);
  }

  return (
    <div className="flex flex-col gap-3 pt-2">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Objectes</h1>
        <button
          onClick={() => navigate('/objects/recipes')}
          className="text-sm text-boat-600"
        >
          Receptes →
        </button>
      </div>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Cercar…"
        className="rounded-xl border border-boat-100 px-4 py-3"
      />

      {filtered.length === 0 ? (
        <EmptyState icon="📦" text="Cap objecte. Crea'n un amb el botó de sota." />
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.map((o) => (
            <li key={o.id}>
              <button
                onClick={() => setEditing(o)}
                className="flex w-full items-center justify-between rounded-2xl bg-white p-3 shadow-sm active:scale-[0.98]"
              >
                <span className="flex items-center gap-2">
                  <span className="text-2xl">{o.icon ?? '📦'}</span>
                  <span className="text-left">
                    <span className="block font-semibold">{o.name}</span>
                    <span className="block text-xs text-boat-500">
                      {o.stockType}
                    </span>
                  </span>
                </span>
                <span className="text-sm text-boat-500">
                  {formatQuantity(invMap.get(o.id)?.quantity ?? 0, o.quantityType)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Button onClick={() => setCreating(true)}>+ Nou objecte</Button>

      <Sheet open={creating} onClose={() => setCreating(false)} title="Nou objecte">
        <ObjectForm onSave={save} onCancel={() => setCreating(false)} />
      </Sheet>
      <Sheet open={!!editing} onClose={() => setEditing(null)} title="Editar objecte">
        {editing && (
          <ObjectForm initial={editing} onSave={save} onCancel={() => setEditing(null)} />
        )}
      </Sheet>
    </div>
  );
}
