-- ════════════════════════════════════════════════════════════════════════════
-- Migració 0008: reset de l'historial d'avaries (RPC de neteja física)
--
-- En fer un "Esborrar l'historial d'avaries" el client emet una barrera fault_barrier i,
-- a més, crida aquesta RPC per esborrar físicament del log:
--   · tots els events fault_report / fault_update / fault_resolve anteriors al tall
--     (clau d'ordre < cut), i
--   · totes les fault_barrier VELLES excepte la barrera de reset nova.
--
-- La barrera de reset nova (keep_barrier_id) SEMPRE es conserva: és la salvaguarda
-- determinista que neutralitza qualsevol event d'avaria vell que un dispositiu offline
-- pogués repujar després del reset. El log segueix sent la font de veritat; aquesta RPC
-- només allibera espai i evita reaparicions.
--
-- La condició de tall replica EXACTAMENT compareKey del client (occurredAt → deviceId →
-- seq); els events amb clau ESTRICTAMENT < cut s'esborren. Mirall de 0007_stock_reset.
-- ════════════════════════════════════════════════════════════════════════════

create or replace function public.reset_fault_events(
  cut_occurred_at timestamptz,
  cut_device_id   text,
  cut_seq         bigint,
  keep_barrier_id uuid
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare deleted int;
begin
  delete from public.events e
  where
    -- events d'avaria anteriors al tall (clau d'ordre < cut)
    (
      e.type in ('fault_report', 'fault_update', 'fault_resolve')
      and (
        e.occurred_at < cut_occurred_at
        or (e.occurred_at = cut_occurred_at and e.device_id < cut_device_id)
        or (e.occurred_at = cut_occurred_at and e.device_id = cut_device_id and e.seq < cut_seq)
      )
    )
    -- barreres velles (qualsevol fault_barrier que no sigui la de reset nova)
    or (e.type = 'fault_barrier' and e.id <> keep_barrier_id);

  get diagnostics deleted = row_count;
  return deleted;
end $$;

-- Només usuaris autenticats poden cridar la RPC.
revoke all on function public.reset_fault_events(timestamptz, text, bigint, uuid) from public;
grant execute on function public.reset_fault_events(timestamptz, text, bigint, uuid) to authenticated;
