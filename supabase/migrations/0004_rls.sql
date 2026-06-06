-- ════════════════════════════════════════════════════════════════════════════
-- Migració 0004: Row Level Security (model de contrasenya compartida)
-- No hi ha comptes individuals: tota la tripulació entra amb un sol usuari Supabase
-- la contrasenya del qual és la del vaixell. Per tant, qualsevol usuari `authenticated`
-- pot accedir a totes les dades del vaixell.
-- ════════════════════════════════════════════════════════════════════════════

-- ── events: append-only (només select + insert; mai update/delete) ───────────
alter table public.events enable row level security;

drop policy if exists ev_read on public.events;
create policy ev_read on public.events
  for select to authenticated using (true);

drop policy if exists ev_write on public.events;
create policy ev_write on public.events
  for insert to authenticated with check (true);
-- (Cap política d'update/delete → el log és immutable a nivell de BD.)

-- ── taules de definició: select + insert + update (el mirall del trigger) ────
-- El trigger corre amb els privilegis del propietari, però habilitem RLS i obrim
-- l'accés a authenticated per si algun client llegeix/escriu directament.
do $$
declare t text;
begin
  foreach t in array array['objects','locations','recipes','checklist_templates']
  loop
    execute format('alter table public.%I enable row level security;', t);

    execute format('drop policy if exists def_read on public.%I;', t);
    execute format(
      'create policy def_read on public.%I for select to authenticated using (true);', t);

    execute format('drop policy if exists def_write on public.%I;', t);
    execute format(
      'create policy def_write on public.%I for insert to authenticated with check (true);', t);

    execute format('drop policy if exists def_update on public.%I;', t);
    execute format(
      'create policy def_update on public.%I for update to authenticated using (true) with check (true);', t);
  end loop;
end $$;
