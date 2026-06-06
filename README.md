# ⛵ Boat Stock Manager

PWA per gestionar l'estiva i les provisions d'un veler: trobar on és cada cosa i
controlar el menjar (existències, caducitats, receptes). Pensada per a la tripulació
(4-5 persones), **funciona totalment offline** i sincronitza quan torna la cobertura.
No es publica a cap store: s'instal·la des d'una URL a Android i iPhone.

## Stack

- **React + TypeScript + Vite** · PWA amb `vite-plugin-pwa`
- **Tailwind CSS** (mobile-first, botons grans)
- **Dexie.js** (IndexedDB) per a l'offline
- **Supabase** (Postgres + Auth + Storage) per al núvol — free tier
- **Cloudflare Pages** per al hosting (GitHub Pages com a alternativa)

## Arquitectura (resum)

Tot canvi és un **esdeveniment** append-only (event sourcing). L'inventari es **deriva**
reproduint el log amb saturació a 0 **per pas** (l'estoc mai és negatiu). Aquest model fa
que diverses persones puguin treballar offline alhora i que la sincronització no tingui
conflictes. Detalls complets a [PLA.md](PLA.md).

## Desenvolupament

```bash
npm install
cp .env.example .env.local   # opcional: omple les credencials de Supabase
npm run dev                  # servidor de desenvolupament
npm test                     # tests unitaris del domini (Vitest)
npm run build                # build de producció (genera la PWA)
npm run preview              # previsualitza el build
```

Sense `.env.local`, l'app arrenca en **mode local** (tot funciona offline; la
sincronització s'activa quan configures Supabase).

## Configurar el núvol (Supabase)

Segueix [supabase/README.md](supabase/README.md): crear projecte, executar les
migracions de `supabase/migrations/`, crear l'usuari compartit de la tripulació i omplir
`.env.local`.

## Desplegament

### Opció A — Cloudflare Pages (recomanat)

1. Puja el repo a GitHub.
2. A Cloudflare → Pages → Connect to Git → tria el repo.
3. Build command: `npm run build` · Output directory: `dist`.
4. Variables d'entorn: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`,
   `VITE_CREW_EMAIL`. (No cal `BASE_PATH`: se serveix a l'arrel.)
5. Cada `git push` desplega automàticament. Obre la URL al mòbil i instal·la la PWA.

### Opció B — GitHub Pages

El workflow [.github/workflows/deploy-pages.yml](.github/workflows/deploy-pages.yml) ja
està preparat:

1. Settings → Pages → Source: **GitHub Actions**.
2. Settings → Secrets and variables → Actions: afegeix els tres secrets `VITE_*`.
3. `git push` a `main` → es publica a `https://<usuari>.github.io/<repo>/`.

S'usa `HashRouter`, així que les rutes funcionen en hosting estàtic sense reescriptures.

## Instal·lació al mòbil

- **Android/Chrome:** apareix el botó "Instal·lar" (també a Ajustos dins l'app).
- **iPhone/Safari:** botó Compartir → "Afegir a la pantalla d'inici".

## Estructura

```
src/
  types/        Tipus (entitats + esdeveniments)
  domain/       Lògica pura (fold d'inventari, lots, escalat) + tests
  db/           Dexie: esquema, repositoris, recompute, comandes, backup
  sync/         Client Supabase, motor de sync, cua de fotos
  auth/         Login (contrasenya compartida + nom)
  hooks/        Lectures reactives (useLiveQuery) i derivats
  routes/       Pantalles
  features/     Components per funcionalitat
  components/   UI compartida
supabase/       Migracions SQL + guia
```
