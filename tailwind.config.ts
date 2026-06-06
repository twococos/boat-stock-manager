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
    },
  },
  plugins: [],
} satisfies Config;
