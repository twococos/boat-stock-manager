-- ════════════════════════════════════════════════════════════════════════════
-- boat-stock-manager — Esquema base
-- Migració 0001: taules de definició + log d'esdeveniments append-only
-- ════════════════════════════════════════════════════════════════════════════

-- ── Taules de DEFINICIÓ (mirall de l'estat actual; last-writer-wins per esdeveniment)
-- Es mantenen sincronitzades pel trigger de la migració 0002. L'inventari NO és cap
-- taula: el deriva el client a partir del log d'esdeveniments.

create table if not exists public.objects (
  id uuid primary key,
  name text not null,
  icon text,
  stock_type text not null check (stock_type in ('food','consumable','tools','other')),
  quantity_type text not null check (quantity_type in ('units','kg','L')),
  usual_location_ids uuid[] not null default '{}',
  food_category text,
  expiry jsonb,
  track_duration boolean default false,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table if not exists public.locations (
  id uuid primary key,
  name text not null,
  description text,
  photo_path text,
  parent_id uuid references public.locations(id),
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table if not exists public.recipes (
  id uuid primary key,
  title text not null,
  ingredients jsonb not null,
  prep_time_minutes int,
  needs_cooking boolean,
  steps jsonb,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table if not exists public.checklist_templates (
  id uuid primary key,
  title text not null,
  items jsonb not null,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

-- ── EL LOG D'ESDEVENIMENTS APPEND-ONLY (font de veritat) ──────────────────────
create table if not exists public.events (
  server_seq  bigserial primary key,   -- ordre global autoritzat al servidor
  id          uuid not null unique,    -- UUID v7 del client → dedup idempotent
  type        text not null,
  occurred_at timestamptz not null,    -- rellotge del client (ordre del fold)
  device_id   text not null,
  seq         bigint not null,         -- monòton per dispositiu
  user_name   text not null,
  payload     jsonb not null,          -- el cos AppEvent complet
  received_at timestamptz not null default now()
);

create index if not exists events_occurred_idx
  on public.events (occurred_at, device_id, seq);
create unique index if not exists events_device_seq_idx
  on public.events (device_id, seq);
create index if not exists events_server_seq_idx
  on public.events (server_seq);
