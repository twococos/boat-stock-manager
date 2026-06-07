/**
 * Redimensiona una imatge a un costat màxim mantenint la proporció i la torna com a
 * Blob JPEG. Estalvia espai a IndexedDB i amplada de banda en sincronitzar. Si el
 * navegador no pot descodificar la imatge, llança un error.
 */
export async function resizeImageToBlob(file: File, maxSize = 1024): Promise<Blob> {
  const bitmap = await loadBitmap(file);
  const { width, height } = bitmap;
  const scale = Math.min(1, maxSize / Math.max(width, height));
  const w = Math.round(width * scale);
  const h = Math.round(height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No s’ha pogut crear el context del canvas.');
  ctx.drawImage(bitmap, 0, 0, w, h);
  if ('close' in bitmap) (bitmap as ImageBitmap).close?.();

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('No s’ha pogut codificar la imatge.'))),
      'image/jpeg',
      0.8,
    );
  });
}

/** Carrega un File com a font dibuixable (ImageBitmap si es pot, si no <img>). */
async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file);
    } catch {
      // Caiem al mètode amb <img> (p.ex. formats que createImageBitmap no admet).
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('No s’ha pogut carregar la imatge.'));
      img.src = url;
    });
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}
