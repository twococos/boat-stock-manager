import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
}

const variants: Record<Variant, string> = {
  primary: 'bg-boat-700 text-white',
  secondary: 'bg-boat-100 text-boat-900',
  danger: 'bg-red-600 text-white',
  ghost: 'bg-transparent text-boat-700',
};

/** Botó tàctil gran, usable amb mans molles / al sol. */
export function Button({
  variant = 'primary',
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`btn-touch w-full disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
