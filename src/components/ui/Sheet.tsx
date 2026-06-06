import type { ReactNode } from 'react';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

/** Full lliscant inferior (bottom sheet) per a formularis i seleccions. */
export function Sheet({ open, onClose, title, children }: SheetProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative max-h-[90vh] overflow-y-auto rounded-t-3xl bg-white p-4 pb-8 shadow-xl">
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-gray-300" />
        {title && <h2 className="mb-3 text-xl font-bold text-boat-900">{title}</h2>}
        {children}
      </div>
    </div>
  );
}
