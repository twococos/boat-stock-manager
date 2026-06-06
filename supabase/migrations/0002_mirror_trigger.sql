-- ════════════════════════════════════════════════════════════════════════════
-- Migració 0002: trigger de mirall
-- Aplica els payloads dels esdeveniments *_upsert a les taules de definició, de
-- manera que qualsevol client que només empenyi esdeveniments produeix un mirall
-- consistent. (L'inventari NO es mira aquí: el deriva el client.)
-- ════════════════════════════════════════════════════════════════════════════

create or replace function public.apply_event_to_mirror()
returns trigger language plpgsql as $$
declare
  p jsonb := new.payload -> 'payload';   -- els *_upsert porten l'entitat sota .payload
begin
  if new.type = 'object_upsert' then
    insert into public.objects (
      id, name, icon, stock_type, quantity_type, usual_location_ids,
      food_category, expiry, track_duration, created_at, updated_at
    ) values (
      (p->>'id')::uuid,
      p->>'name',
      p->>'icon',
      p->>'stockType',
      p->>'quantityType',
      coalesce(
        (select array_agg(value::uuid)
           from jsonb_array_elements_text(p->'usualLocationIds')),
        '{}'
      ),
      p->>'foodCategory',
      p->'expiry',
      coalesce((p->>'trackDuration')::boolean, false),
      (p->>'createdAt')::timestamptz,
      (p->>'updatedAt')::timestamptz
    )
    on conflict (id) do update set
      name = excluded.name,
      icon = excluded.icon,
      stock_type = excluded.stock_type,
      quantity_type = excluded.quantity_type,
      usual_location_ids = excluded.usual_location_ids,
      food_category = excluded.food_category,
      expiry = excluded.expiry,
      track_duration = excluded.track_duration,
      updated_at = excluded.updated_at
    where excluded.updated_at >= public.objects.updated_at;  -- last-writer-wins

  elsif new.type = 'location_upsert' then
    insert into public.locations (
      id, name, description, photo_path, parent_id, created_at, updated_at
    ) values (
      (p->>'id')::uuid, p->>'name', p->>'description', p->>'photoPath',
      nullif(p->>'parentId','')::uuid,
      (p->>'createdAt')::timestamptz, (p->>'updatedAt')::timestamptz
    )
    on conflict (id) do update set
      name = excluded.name,
      description = excluded.description,
      photo_path = excluded.photo_path,
      parent_id = excluded.parent_id,
      updated_at = excluded.updated_at
    where excluded.updated_at >= public.locations.updated_at;

  elsif new.type = 'recipe_upsert' then
    insert into public.recipes (
      id, title, ingredients, prep_time_minutes, needs_cooking, steps,
      created_at, updated_at
    ) values (
      (p->>'id')::uuid, p->>'title', p->'ingredients',
      (p->>'prepTimeMinutes')::int,
      (p->>'needsCooking')::boolean,
      p->'steps',
      (p->>'createdAt')::timestamptz, (p->>'updatedAt')::timestamptz
    )
    on conflict (id) do update set
      title = excluded.title,
      ingredients = excluded.ingredients,
      prep_time_minutes = excluded.prep_time_minutes,
      needs_cooking = excluded.needs_cooking,
      steps = excluded.steps,
      updated_at = excluded.updated_at
    where excluded.updated_at >= public.recipes.updated_at;

  elsif new.type = 'checklist_upsert' then
    insert into public.checklist_templates (
      id, title, items, created_at, updated_at
    ) values (
      (p->>'id')::uuid, p->>'title', p->'items',
      (p->>'createdAt')::timestamptz, (p->>'updatedAt')::timestamptz
    )
    on conflict (id) do update set
      title = excluded.title,
      items = excluded.items,
      updated_at = excluded.updated_at
    where excluded.updated_at >= public.checklist_templates.updated_at;
  end if;

  return new;
end $$;

drop trigger if exists trg_apply_event_to_mirror on public.events;
create trigger trg_apply_event_to_mirror
  after insert on public.events
  for each row execute function public.apply_event_to_mirror();
