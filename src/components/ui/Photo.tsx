import { useImageViewer } from './ImageViewer';

/**
 * Imatge de contingut clicable: en tocar-la s'obre al visor a pantalla completa amb zoom.
 * Reemplaça els `<img>` de fotos/contingut perquè totes tinguin el mateix comportament.
 * Per a imatges que NO han d'obrir el visor (p.ex. miniatura del formulari d'edició), fes
 * servir un `<img>` normal.
 */
export function Photo({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const { open } = useImageViewer();
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onClick={() => open(src, alt)}
      className={`cursor-zoom-in ${className ?? ''}`}
    />
  );
}
