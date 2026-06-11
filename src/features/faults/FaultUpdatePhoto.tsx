import { useLocationPhoto } from '@/hooks/useLocationPhoto';
import { Photo } from '@/components/ui/Photo';
import { t } from '@/text';

/**
 * Foto d'una actualització d'avaria dins la targeta. Resol la ruta a Storage (blob local
 * offline o URL signada) i la mostra clicable: en tocar-la s'obre el visor a pantalla completa.
 */
export function FaultUpdatePhoto({ photoPath }: { photoPath: string }) {
  const url = useLocationPhoto(photoPath);
  if (!url) {
    return <div className="h-32 w-full animate-pulse rounded-lg bg-boat-100" />;
  }
  return (
    <Photo
      src={url}
      alt={t.faults.updatePhotoAlt}
      className="max-h-56 w-full rounded-lg object-cover"
    />
  );
}
