import { useState } from 'react';
import { Button } from './Button';
import { Trash2 } from './icons';

/**
 * Botó d'eliminar amb confirmació en dos passos (evita esborrats accidentals amb mans
 * molles a una pantalla tàctil). El primer toc mostra el missatge de confirmació; el
 * segon executa `onConfirm`.
 */
export function ConfirmDelete({
  label = 'Eliminar',
  message,
  onConfirm,
}: {
  label?: string;
  message: string;
  onConfirm: () => void | Promise<void>;
}) {
  const [armed, setArmed] = useState(false);

  if (!armed) {
    return (
      <Button variant="danger" onClick={() => setArmed(true)}>
        <span className="inline-flex items-center justify-center gap-2">
          <Trash2 size={18} />
          {label}
        </span>
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border-2 border-red-200 bg-red-50 p-3">
      <p className="text-sm text-red-700">{message}</p>
      <div className="flex gap-2">
        <Button variant="secondary" onClick={() => setArmed(false)}>
          Cancel·lar
        </Button>
        <Button variant="danger" onClick={() => void onConfirm()}>
          Sí, eliminar
        </Button>
      </div>
    </div>
  );
}
