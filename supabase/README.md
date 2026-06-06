# Configuració de Supabase

Aquest directori conté les migracions SQL per al backend de **boat-stock-manager**.
Tot el que cal és gratuït dins el free tier de Supabase per a l'ús previst (4-5 usuaris,
volum molt petit).

## Passos (un sol cop)

1. **Crear projecte**
   - Vés a https://supabase.com → New project. Tria una regió propera (p.ex. EU).
   - Guarda la contrasenya de la base de dades (no és la del vaixell).

2. **Executar les migracions**
   - Al panell: **SQL Editor** → New query.
   - Enganxa i executa, EN ORDRE, el contingut de cada fitxer de `migrations/`:
     1. `0001_schema.sql`
     2. `0002_mirror_trigger.sql`
     3. `0003_push_rpc.sql`
     4. `0004_rls.sql`
     5. `0005_storage.sql`

3. **Crear l'usuari compartit de la tripulació**
   - Panell → **Authentication** → Users → **Add user** → *Create new user*.
   - Email: `crew@boat-stock-manager.local` (ha de coincidir amb `VITE_CREW_EMAIL`).
   - Password: **la contrasenya del vaixell** (la que escriurà la tripulació al login).
   - Marca *Auto Confirm User* perquè no calgui verificar email.
   - (Authentication → Providers → Email: desactiva "Confirm email" si cal.)

4. **Obtenir les credencials del client**
   - Panell → **Project Settings** → **API**.
   - Copia *Project URL* i la clau *anon public*.

5. **Configurar el frontend**
   - Copia `.env.example` a `.env.local` a l'arrel del projecte i omple:
     ```
     VITE_SUPABASE_URL=https://EL-TEU-PROJECTE.supabase.co
     VITE_SUPABASE_ANON_KEY=la-teva-anon-key
     VITE_CREW_EMAIL=crew@boat-stock-manager.local
     ```

## Model de dades (resum)

- `events`: log append-only, font de veritat. Insercions via RPC `push_events`
  (idempotent per `id`). Sense update/delete (RLS).
- `objects`, `locations`, `recipes`, `checklist_templates`: **mirall** mantingut pel
  trigger `apply_event_to_mirror` a partir dels esdeveniments `*_upsert`
  (last-writer-wins per `updated_at`).
- **L'inventari NO és cap taula**: el client el deriva del log (fold amb saturació a 0).
- Storage: bucket privat `boat-photos` (prefixos `objects/`, `locations/`).

## Seguretat

El model és de **contrasenya compartida**: tothom entra amb el mateix usuari Supabase.
Qualsevol `authenticated` té accés total a les dades del vaixell. Per rotar l'accés,
canvia la contrasenya de l'usuari `crew@…` al panell (Authentication → Users).
