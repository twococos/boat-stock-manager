import { useEffect, useState, type ReactNode } from 'react';
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

/**
 * Selector numèric amb botons grans − / + i camp de text editable al mig (per poder
 * escriure directament una quantitat gran sense clicar moltes vegades). El camp manté un
 * buffer de text propi per permetre estats intermedis (buit, "1.", coma decimal) sense que
 * el valor salti; en sortir del camp (blur) es valida i, si no és vàlid, es reverteix.
 */
export function NumberStepper({
  value,
  onChange,
  min = 0,
  step = 1,
  size = 'md',
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  step?: number;
  /** `sm` = compacte, per a steppers inline dins targetes (llista, revisar estoc). */
  size?: 'sm' | 'md';
}) {
  const round = (n: number) => Math.round(n * 1000) / 1000;
  const [text, setText] = useState(String(value));

  // Sincronitza el camp quan el valor canvia des de fora (botons − / + o reset del pare).
  useEffect(() => {
    setText(String(value));
  }, [value]);

  function commit(raw: string) {
    const n = parseFloat(raw.replace(',', '.'));
    if (isNaN(n)) {
      setText(String(value)); // reverteix a l'últim valor vàlid
      return;
    }
    onChange(round(Math.max(min, n)));
  }

  const sm = size === 'sm';
  const btn = sm ? 'h-9 w-9 text-lg' : 'h-12 w-12 text-2xl';
  const field = sm ? 'w-12 text-lg' : 'w-16 text-2xl';
  const gap = sm ? 'gap-1.5' : 'gap-3';

  return (
    <div className={`flex items-center ${gap}`}>
      <button
        type="button"
        onClick={() => onChange(round(Math.max(min, value - step)))}
        className={`${btn} rounded-full bg-boat-100 font-bold text-boat-900 active:scale-90`}
      >
        −
      </button>
      <input
        type="text"
        inputMode="decimal"
        value={text}
        onChange={(e) => {
          const raw = e.target.value;
          setText(raw);
          const n = parseFloat(raw.replace(',', '.'));
          if (!isNaN(n) && n >= min) onChange(round(n));
        }}
        onFocus={(e) => e.target.select()}
        onBlur={(e) => commit(e.target.value)}
        className={`${field} rounded-xl border border-boat-100 bg-transparent text-center font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-boat-500`}
      />
      <button
        type="button"
        onClick={() => onChange(round(value + step))}
        className={`${btn} rounded-full bg-boat-700 font-bold text-white active:scale-90`}
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

/**
 * Botó d'una fila de toggles (estil segmentat) per mostrar/amagar targetes d'acció. `active`
 * el tenyeix amb l'accent. Usat als panells de recursos (mesura / omplir / canviar bombona).
 */
export function ToggleButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-xl px-3 py-3 text-sm font-semibold active:scale-95 ${
        active ? 'bg-boat-700 text-white' : 'bg-boat-100 text-boat-900'
      }`}
    >
      {label}
    </button>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl bg-white p-4 shadow-sm ${className}`}>{children}</div>
  );
}

/**
 * Barra de progrés horitzontal (0..100%). El color de l'ompliment vira a ambre per sota del
 * 25% i a vermell per sota del 10% per donar senyal visual de nivell baix. `percent` null →
 * barra buida (recurs encara sense mesura).
 */
export function ProgressBar({
  percent,
  className = '',
}: {
  percent: number | null;
  className?: string;
}) {
  const p = percent === null ? 0 : Math.min(100, Math.max(0, percent));
  const color =
    percent === null
      ? 'bg-boat-200'
      : p < 10
        ? 'bg-red-500'
        : p < 25
          ? 'bg-amber-500'
          : 'bg-boat-500';
  return (
    <div
      className={`h-2.5 w-full overflow-hidden rounded-full bg-boat-100 ${className}`}
      role="progressbar"
      aria-valuenow={Math.round(p)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${p}%` }} />
    </div>
  );
}
