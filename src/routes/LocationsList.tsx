import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { StowageLocation } from '@/types/entities';
import { Sheet } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/common';
import { Archive } from '@/components/ui/icons';
import { LocationForm } from '@/features/locations/LocationForm';
import { useLocations } from '@/hooks/useData';
import { commitLocationUpsert } from '@/db/commands';
import { useAuth } from '@/auth/AuthProvider';

/** Llista de llocs d'estiva. En tocar-ne un, s'obre la vista del compartiment. */
export function LocationsList() {
  const { userName } = useAuth();
  const navigate = useNavigate();
  const locations = useLocations() ?? [];
  const [creating, setCreating] = useState(false);

  async function save(l: StowageLocation) {
    if (!userName) return;
    await commitLocationUpsert(userName, l);
    setCreating(false);
  }

  return (
    <div className="flex flex-col gap-3 pt-2">
      <h1 className="text-xl font-bold">Llocs d'estiva</h1>

      {locations.length === 0 ? (
        <EmptyState icon={Archive} text="Cap lloc definit encara." />
      ) : (
        <ul className="grid grid-cols-2 gap-2">
          {locations.map((l) => (
            <li key={l.id}>
              <button
                onClick={() => navigate(`/locations/${l.id}`)}
                className="flex min-h-touch w-full flex-col items-start justify-center gap-1 rounded-2xl bg-white p-3 shadow-sm active:scale-[0.98]"
              >
                <Archive size={26} className="text-boat-700" />
                <span className="font-semibold">{l.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Button onClick={() => setCreating(true)}>+ Nou lloc</Button>

      <Sheet open={creating} onClose={() => setCreating(false)} title="Nou lloc">
        <LocationForm onSave={save} onCancel={() => setCreating(false)} />
      </Sheet>
    </div>
  );
}
