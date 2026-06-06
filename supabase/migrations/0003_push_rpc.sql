-- ════════════════════════════════════════════════════════════════════════════
-- Migració 0003: RPC d'inserció idempotent d'esdeveniments
-- El client envia un lot d'esdeveniments; els ja existents (per id) s'ignoren.
-- ════════════════════════════════════════════════════════════════════════════

create or replace function public.push_events(batch jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.events (id, type, occurred_at, device_id, seq, user_name, payload)
  select
    (e->>'id')::uuid,
    e->>'type',
    (e->>'occurredAt')::timestamptz,
    e->>'deviceId',
    (e->>'seq')::bigint,
    e->>'userName',
    e
  from jsonb_array_elements(batch) as e
  on conflict (id) do nothing;
end $$;

-- Només usuaris autenticats poden cridar la RPC.
revoke all on function public.push_events(jsonb) from public;
grant execute on function public.push_events(jsonb) to authenticated;
