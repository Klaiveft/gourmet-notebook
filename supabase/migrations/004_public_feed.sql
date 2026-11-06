-- Fil général : une recette peut être publiée pour toutes les personnes connectées.
-- La publication est un choix explicite, distinct du partage familial. Les essais restent privés.

alter table public.recipes
  add column is_public boolean not null default false,
  add column published_at timestamptz,
  -- Auteur et licence d'une photo sous licence libre : cette attribution est une obligation légale
  add column image_credit text;

create index recipes_public_feed on public.recipes (published_at desc) where is_public;

-- `to authenticated` : rien de public sans compte. Ingrédients, étapes, j'aime et commentaires
-- suivent seuls, car leurs politiques passent par le RLS de recipes.
create policy "Members read public recipes" on public.recipes
  for select to authenticated using (is_public);

-- On ne voit que le nom et la photo des personnes qui se sont exposées : auteur d'une recette
-- publique, ou d'un commentaire que je peux lire. Les autres comptes restent invisibles.
create policy "Members read public authors" on public.profiles
  for select to authenticated using (
    exists (select 1 from public.recipes r where r.user_id = profiles.id and r.is_public)
  );

create policy "Readers see comment authors" on public.profiles
  for select to authenticated using (
    exists (select 1 from public.recipe_comments c where c.user_id = profiles.id)
  );

-- Remplacer la photo d'une recette retire le crédit de l'ancienne
create or replace function public.save_recipe(
  p_recipe jsonb,
  p_ingredients jsonb,
  p_steps jsonb,
  p_recipe_id uuid default null -- null = création
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_recipe_id is null then
    insert into recipes (
      user_id, title, description, category, prep_time_minutes, cook_time_minutes,
      servings, difficulty, image_url, source_platform, source_url
    ) values (
      auth.uid(),
      p_recipe->>'title',
      p_recipe->>'description',
      (p_recipe->>'category')::recipe_category,
      (p_recipe->>'prep_time_minutes')::integer,
      (p_recipe->>'cook_time_minutes')::integer,
      (p_recipe->>'servings')::integer,
      (p_recipe->>'difficulty')::recipe_difficulty,
      p_recipe->>'image_url',
      p_recipe->>'source_platform',
      p_recipe->>'source_url'
    ) returning id into v_id;
  else
    update recipes set
      title = p_recipe->>'title',
      description = p_recipe->>'description',
      category = (p_recipe->>'category')::recipe_category,
      prep_time_minutes = (p_recipe->>'prep_time_minutes')::integer,
      cook_time_minutes = (p_recipe->>'cook_time_minutes')::integer,
      servings = (p_recipe->>'servings')::integer,
      difficulty = (p_recipe->>'difficulty')::recipe_difficulty,
      image_credit = case when image_url is distinct from p_recipe->>'image_url' then null else image_credit end,
      image_url = p_recipe->>'image_url',
      source_platform = p_recipe->>'source_platform',
      source_url = p_recipe->>'source_url'
    where id = p_recipe_id
    returning id into v_id;

    if v_id is null then
      raise exception 'Recette introuvable' using errcode = 'P0002';
    end if;

    delete from recipe_ingredients where recipe_id = v_id;
    delete from recipe_steps where recipe_id = v_id;
  end if;

  insert into recipe_ingredients (recipe_id, name, quantity, unit, notes, order_index)
  select v_id, el->>'name', (el->>'quantity')::numeric, el->>'unit', el->>'notes', (ord - 1)::integer
  from jsonb_array_elements(p_ingredients) with ordinality as t(el, ord);

  insert into recipe_steps (recipe_id, step_number, instruction, duration_minutes, tip, order_index)
  select v_id, ord::integer, el->>'instruction', (el->>'duration_minutes')::integer, el->>'tip', (ord - 1)::integer
  from jsonb_array_elements(p_steps) with ordinality as t(el, ord);

  return v_id;
end;
$$;

-- La copie d'une recette garde le crédit de sa photo
create or replace function public.copy_recipe(p_recipe_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid;
begin
  select id into v_id from recipes where user_id = auth.uid() and forked_from = p_recipe_id;
  if v_id is not null then
    return v_id;
  end if;

  insert into recipes (
    user_id, title, description, category, prep_time_minutes, cook_time_minutes,
    servings, difficulty, source_platform, source_url, forked_from, image_credit
  )
  select
    auth.uid(), title, description, category, prep_time_minutes, cook_time_minutes,
    servings, difficulty, source_platform, source_url, id, image_credit
  from recipes
  where id = p_recipe_id and user_id <> auth.uid()
  returning id into v_id;

  if v_id is null then
    raise exception 'Recette introuvable' using errcode = 'P0002';
  end if;

  insert into recipe_ingredients (recipe_id, name, quantity, unit, notes, order_index)
  select v_id, name, quantity, unit, notes, order_index
  from recipe_ingredients where recipe_id = p_recipe_id;

  insert into recipe_steps (recipe_id, step_number, instruction, duration_minutes, tip, order_index)
  select v_id, step_number, instruction, duration_minutes, tip, order_index
  from recipe_steps where recipe_id = p_recipe_id;

  return v_id;
end;
$$;
