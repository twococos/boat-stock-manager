import type { ReactNode } from 'react';
import { Inbox, type LucideIcon } from './icons';

/** Estat buit reutilitzable per a llistes sense elements. */
export function EmptyState({
  icon: Icon = Inbox,
  text,
}: {
  icon?: LucideIcon;
  text: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 py-12 text-center text-boat-500">
      <Icon size={48} strokeWidth={1.5} className="text-boat-400" />
      <p>{text}</p>
    </div>
  );
}

/** Selector numèric amb botons grans − / + per a quantitats. */
export function NumberStepper({
  value,
  onChange,
  min = 0,
  step = 1,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  step?: number;
}) {
  const round = (n: number) => Math.round(n * 1000) / 1000;
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => onChange(round(Math.max(min, value - step)))}
        className="h-12 w-12 rounded-full bg-boat-100 text-2xl font-bold text-boat-900 active:scale-90"
      >
        −
      </button>
      <span className="min-w-[3rem] text-center text-2xl font-semibold tabular-nums">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(round(value + step))}
        className="h-12 w-12 rounded-full bg-boat-700 text-2xl font-bold text-white active:scale-90"
      >
        +
      </button>
    </div>
  );
}

/** Targeta clicable amb icona + text per a graelles d'opcions. */
export function TileButton({
  icon: Icon,
  label,
  onClick,
  className = '',
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex min-h-touch flex-col items-center justify-center gap-1 rounded-2xl p-4 shadow-sm active:scale-95 ${className}`}
    >
      <Icon size={28} />
      <span className="text-sm font-semibold">{label}</span>
    </button>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl bg-white p-4 shadow-sm ${className}`}>{children}</div>
  );
}
