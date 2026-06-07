import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

// https://vitejs.dev/config/
// BASE_PATH permet desplegar sota un subdirectori (GitHub Pages: '/boat-stock-manager/').
// Per a Cloudflare Pages / domini propi deixa'l sense definir (per defecte '/').
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js'],
          dexie: ['dexie', 'dexie-react-hooks'],
        },
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifest: {
        name: 'Boat Stock Manager',
        short_name: 'BoatStock',
        description: "Gestió de l'estiva i les provisions del veler",
        theme_color: '#0c4a6e',
        background_color: '#f0f9ff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Precache de l'app shell
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Els sets d'icones (Tabler ~2 MB) van en chunks lazy però es PRECACHEgen perquè
        // el selector funcioni offline. Cal pujar el límit per defecte (2 MiB) de Workbox.
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        // NO cauar l'API de Supabase (les dades viuen a Dexie i les gestiona el sync).
        navigateFallbackDenylist: [/^\/auth/, /supabase\.co/],
        runtimeCaching: [
          {
            // Fotos de Storage: CacheFirst perquè siguin visibles offline un cop vistes.
            urlPattern: ({ url }) =>
              url.hostname.endsWith('supabase.co') &&
              url.pathname.includes('/storage/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'boat-photos',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
});
