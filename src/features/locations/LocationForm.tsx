import { useRef, useState } from 'react';
import type { StowageLocation } from '@/types/entities';
import { Button } from '@/components/ui/Button';
import { ObjectIcon } from '@/components/ui/ObjectIcon';
import { Archive } from '@/components/ui/icons';
import { useLocationPhoto } from '@/hooks/useLocationPhoto';
import { enqueuePhoto } from '@/sync/photoQueue';
import { resizeImageToBlob } from '@/lib/image';
import { newId } from '@/lib/id';
import { nowISO } from '@/lib/time';
import { t } from '@/text';

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
  // L'id ha de ser estable abans de desar perquè la ruta de la foto el referenciï.
  const idRef = useRef(initial?.id ?? newId());
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [photoPath, setPhotoPath] = useState(initial?.photoPath);
  const [busy, setBusy] = useState(false);
  const previewUrl = useLocationPhoto(photoPath);
  const field = 'rounded-xl border border-boat-100 px-4 py-3 w-full';

  async function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // permet re-seleccionar el mateix fitxer
    if (!file) return;
    setBusy(true);
    try {
      const blob = await resizeImageToBlob(file);
      const path = await enqueuePhoto(blob, 'location', idRef.current);
      setPhotoPath(path);
    } catch {
      // Imatge no vàlida: simplement no s'actualitza.
    } finally {
      setBusy(false);
    }
  }

  function submit() {
    if (!name.trim()) return;
    const now = nowISO();
    onSave({
      id: idRef.current,
      name: name.trim(),
      description: description.trim() || undefined,
      photoPath,
      parentId: initial?.parentId ?? null,
      createdAt: initial?.createdAt ?? now,
      updatedAt: now,
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <input className={field} placeholder={t.locationForm.namePlaceholder} value={name} onChange={(e) => setName(e.target.value)} />
      <textarea
        className={field}
        rows={2}
        placeholder={t.locationForm.descriptionPlaceholder}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <label className="text-sm font-medium text-boat-700">{t.locationForm.image}</label>
      <div className="flex items-center gap-3">
        <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-boat-50">
          {previewUrl ? (
            <img src={previewUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <ObjectIcon icon={undefined} size={28} fallback={Archive} className="text-boat-300" />
          )}
        </div>
        <label className="btn-touch flex-1 cursor-pointer bg-boat-100 text-boat-900">
          {busy ? t.locationForm.processing : previewUrl ? t.locationForm.changeImage : t.locationForm.addImage}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={onPickPhoto}
          />
        </label>
      </div>

      <div className="mt-2 flex gap-2">
        <Button variant="secondary" onClick={onCancel}>{t.common.cancel}</Button>
        <Button onClick={submit}>{t.common.save}</Button>
      </div>
    </div>
  );
}
