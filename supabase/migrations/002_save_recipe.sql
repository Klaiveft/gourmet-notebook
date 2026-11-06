-- Enregistre une recette et ses lignes dans une seule transaction : une coupure réseau
-- entre deux requêtes ne doit jamais laisser une recette sans ingrédients ni étapes.
-- security invoker : le RLS de 001 continue de s'appliquer.
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

-- 001 ne permet que l'envoi et la lecture : sans ceci, supprimer une recette laisserait sa photo.
create policy "Users delete own recipe images"
on storage.objects for delete to authenticated using (
  bucket_id = 'recipe-images' and (auth.uid())::text = (storage.foldername(name))[1]
);
