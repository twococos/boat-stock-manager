import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta granate (color del veler). Es mantenen els noms de to perquè totes
        // les classes boat-* existents heretin l'accent sense tocar-les.
        boat: {
          50: '#fdf2f4', // fons molt clar rosat
          100: '#f9dde2', // secundari clar
          500: '#a8324a', // accent mitjà granate
          700: '#7a1f33', // accent fosc (botons primaris)
          900: '#4a1320', // text fosc granate
        },
      },
      // Mides de toc grans per a ús amb mans molles / al sol
      minHeight: {
        touch: '3.5rem',
      },
      // Animacions senzilles per a transicions de panells i navegació.
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-up': {
          from: { transform: 'translateY(100%)' },
          to: { transform: 'translateY(0)' },
        },
        'slide-down': {
          from: { transform: 'translateY(0)' },
          to: { transform: 'translateY(100%)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 200ms ease-out',
        'slide-up': 'slide-up 250ms ease-out',
        // 'forwards' manté el panell a translateY(100%) en acabar (no torna a 0)
        // fins que es desmunta; ease-in perquè el tancament accelera cap avall.
        'slide-down': 'slide-down 260ms ease-in forwards',
        'scale-in': 'scale-in 180ms ease-out',
      },
    },
  },
  plugins: [],
} satisfies Config;
