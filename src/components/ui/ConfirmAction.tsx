import { useState, type ReactNode } from 'react';
import { Button } from './Button';
import type { LucideIcon } from './icons';
import { t } from '@/text';

/**
 * Botó d'acció amb confirmació en dos passos (evita accions accidentals amb mans molles a
 * una pantalla tàctil). El primer toc mostra el missatge de confirmació; el segon executa
 * `onConfirm`. Generalització de `ConfirmDelete` per a accions que no són "eliminar"
 * (p.ex. rebobinar / reiniciar l'estoc).
 */
export function ConfirmAction({
  label,
  message,
  confirmLabel = t.confirmDelete.confirm,
  icon: Icon,
  variant = 'danger',
  onConfirm,
}: {
  label: ReactNode;
  message: string;
  confirmLabel?: string;
  icon?: LucideIcon;
  variant?: 'primary' | 'secondary' | 'danger';
  onConfirm: () => void | Promise<void>;
}) {
  const [armed, setArmed] = useState(false);

  if (!armed) {
    return (
      <Button variant={variant} onClick={() => setArmed(true)}>
        <span className="inline-flex items-center justify-center gap-2">
          {Icon && <Icon size={18} />}
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
          {t.common.cancel}
        </Button>
        <Button variant={variant} onClick={() => void onConfirm()}>
          {confirmLabel}
        </Button>
      </div>
    </div>
  );
}
