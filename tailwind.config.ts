import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta marina
        boat: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          500: '#0ea5e9',
          700: '#0369a1',
          900: '#0c4a6e',
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
