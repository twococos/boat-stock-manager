import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import { getPhotoUrl } from '@/sync/photoQueue';

/**
 * Resol una foto a partir de la seva ruta a Storage (`photoPath`).
 *
 * Prioritza el Blob local de la cua `pendingPhotos` (disponible immediatament i offline,
 * inclòs el mode local sense Supabase). Si no hi és (p.ex. ja s'ha pujat i purgat de la
 * cua), demana una URL signada a Supabase. Retorna `null` mentre no hi ha res a mostrar.
 *
 * Gestiona el cicle de vida de l'object URL del Blob (revoke en canviar de foto o
 * desmuntar) per evitar fuites de memòria.
 */
export function useLocationPhoto(photoPath?: string): string | null {
  const pending = useLiveQuery(
    () => (photoPath ? db.pendingPhotos.get(photoPath) : undefined),
    [photoPath],
  );
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!photoPath) {
      setUrl(null);
      return;
    }

    // 1) Blob local disponible → object URL immediat.
    if (pending?.blob) {
      const objectUrl = URL.createObjectURL(pending.blob);
      setUrl(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    }

    // 2) Sense blob local: prova la URL signada de Supabase (null en mode local).
    let active = true;
    getPhotoUrl(photoPath).then((signed) => {
      if (active) setUrl(signed);
    });
    return () => {
      active = false;
    };
  }, [photoPath, pending]);

  return url;
}
