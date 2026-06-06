import { useState } from 'react';
import type { StowageLocation } from '@/types/entities';
import { Button } from '@/components/ui/Button';
import { newId } from '@/lib/id';
import { nowISO } from '@/lib/time';

/** Formulari de creació/edició d'un lloc d'estiva. PLA.md secció 12.5. */
export function LocationForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: StowageLocation;
  onSave: (l: StowageLocation) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const field = 'rounded-xl border border-boat-100 px-4 py-3 w-full';

  function submit() {
    if (!name.trim()) return;
    const now = nowISO();
    onSave({
      id: initial?.id ?? newId(),
      name: name.trim(),
      description: description.trim() || undefined,
      photoPath: initial?.photoPath,
      parentId: initial?.parentId ?? null,
      createdAt: initial?.createdAt ?? now,
      updatedAt: now,
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <input className={field} placeholder="Nom del lloc" value={name} onChange={(e) => setName(e.target.value)} />
      <textarea
        className={field}
        rows={2}
        placeholder="Descripció (opcional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <div className="mt-2 flex gap-2">
        <Button variant="secondary" onClick={onCancel}>Cancel·lar</Button>
        <Button onClick={submit}>Desar</Button>
      </div>
    </div>
  );
}
