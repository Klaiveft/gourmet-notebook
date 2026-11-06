-- Réseau familial : profils, familles sur invitation, partage de recettes, j'aime et commentaires.
-- Une recette reste privée tant que son auteur ne la partage pas (is_shared), et n'est alors
-- visible que des personnes avec qui il partage une famille. Les essais restent toujours privés.

-- Profils ---------------------------------------------------------------------------------

alter table public.profiles
  add column bio text check (char_length(bio) <= 300),
  add constraint profiles_display_name_length check (char_length(display_name) <= 60);

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, left(split_part(new.email, '@', 1), 60))
  on conflict do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

insert into public.profiles (id, display_name)
select id, left(split_part(email, '@', 1), 60) from auth.users
on conflict do nothing;

-- Recettes --------------------------------------------------------------------------------

alter table public.recipes
  add column is_shared boolean not null default false,
  add column shared_at timestamptz,
  add column forked_from uuid references public.recipes(id) on delete set null,
  -- Permet à l'API de joindre l'auteur (auth.users n'est pas exposé)
  add constraint recipes_user_profile_fk foreign key (user_id) references public.profiles(id) on delete cascade,
  -- Ces valeurs s'affichent désormais chez d'autres personnes, et l'API se contacte sans passer par Zod
  add constraint recipes_source_url_http check (source_url is null or source_url ~* '^https?://'),
  add constraint recipes_image_url_http check (image_url is null or image_url ~* '^https?://');

create unique index recipes_one_copy_per_user on public.recipes (user_id, forked_from);

-- Familles --------------------------------------------------------------------------------

create table public.families (
  id uuid default gen_random_uuid() primary key,
  name text not null check (char_length(name) between 1 and 60),
  invite_code text not null unique default left(replace(gen_random_uuid()::text, '-', ''), 12),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.family_members (
  family_id uuid references public.families(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  joined_at timestamptz not null default now(),
  primary key (family_id, user_id)
);

create index family_members_user_id on public.family_members (user_id);

-- security definer : ces deux fonctions lisent family_members, dont les politiques les appellent.
-- Sans cela, le RLS boucle sur lui-même.
create function public.is_family_member(p_family_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.family_members
    where family_id = p_family_id and user_id = (select auth.uid())
  );
$$;

create function public.shares_family_with(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.family_members mine
    join public.family_members theirs on theirs.family_id = mine.family_id
    where mine.user_id = (select auth.uid()) and theirs.user_id = p_user_id
  );
$$;

alter table public.families enable row level security;
alter table public.family_members enable row level security;

create policy "Members read their families" on public.families
  for select using (public.is_family_member(id));

create policy "Creators update their families" on public.families
  for update using (created_by = (select auth.uid())) with check (created_by = (select auth.uid()));

create policy "Creators delete their families" on public.families
  for delete using (created_by = (select auth.uid()));

create policy "Members read their family members" on public.family_members
  for select using (public.is_family_member(family_id));

-- Pas de politique d'insertion : on n'entre dans une famille que par create_family ou join_family
create policy "Members leave, creators remove" on public.family_members
  for delete using (
    user_id = (select auth.uid())
    or exists (select 1 from public.families f where f.id = family_id and f.created_by = (select auth.uid()))
  );

-- Partage ---------------------------------------------------------------------------------

create policy "Family reads profiles" on public.profiles
  for select using (public.shares_family_with(id));

create policy "Family reads shared recipes" on public.recipes
  for select using (is_shared and public.shares_family_with(user_id));

-- Le sous-select passe par le RLS de recipes : une ligne n'est lisible que si sa recette l'est
create policy "Family reads shared ingredients" on public.recipe_ingredients
  for select using (exists (select 1 from public.recipes r where r.id = recipe_ingredients.recipe_id));

create policy "Family reads shared steps" on public.recipe_steps
  for select using (exists (select 1 from public.recipes r where r.id = recipe_steps.recipe_id));

-- J'aime et commentaires ------------------------------------------------------------------

create table public.recipe_likes (
  recipe_id uuid references public.recipes(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null default auth.uid(),
  created_at timestamptz not null default now(),
  primary key (recipe_id, user_id)
);

create table public.recipe_comments (
  id uuid default gen_random_uuid() primary key,
  recipe_id uuid references public.recipes(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null default auth.uid(),
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index recipe_comments_recipe_id on public.recipe_comments (recipe_id);

alter table public.recipe_likes enable row level security;
alter table public.recipe_comments enable row level security;

create policy "Readers see likes" on public.recipe_likes
  for select using (exists (select 1 from public.recipes r where r.id = recipe_likes.recipe_id));

create policy "Readers like" on public.recipe_likes
  for insert with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.recipes r where r.id = recipe_likes.recipe_id)
  );

create policy "Users remove own likes" on public.recipe_likes
  for delete using (user_id = (select auth.uid()));

create policy "Readers see comments" on public.recipe_comments
  for select using (exists (select 1 from public.recipes r where r.id = recipe_comments.recipe_id));

create policy "Readers comment" on public.recipe_comments
  for insert with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.recipes r where r.id = recipe_comments.recipe_id)
  );

-- L'auteur de la recette modère ce qui s'écrit sous sa recette
create policy "Authors and recipe owners delete comments" on public.recipe_comments
  for delete using (
    user_id = (select auth.uid())
    or exists (select 1 from public.recipes r where r.id = recipe_comments.recipe_id and r.user_id = (select auth.uid()))
  );

-- Fonctions appelées par l'application ----------------------------------------------------

create function public.create_family(p_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  insert into public.families (name, created_by)
  values (p_name, (select auth.uid()))
  returning id into v_id;

  insert into public.family_members (family_id, user_id) values (v_id, (select auth.uid()));
  return v_id;
end;
$$;

-- Un code d'invitation n'est lisible que par les membres : ces deux fonctions sont la seule porte d'entrée
create function public.family_preview(p_code text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select name from public.families where invite_code = lower(trim(p_code));
$$;

create function public.join_family(p_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  select id into v_id from public.families where invite_code = lower(trim(p_code));
  if v_id is null then
    raise exception 'Invitation introuvable' using errcode = 'P0002';
  end if;

  insert into public.family_members (family_id, user_id)
  values (v_id, (select auth.uid()))
  on conflict do nothing;
  return v_id;
end;
$$;

-- Copie une recette de la famille dans le carnet : elle devient modifiable, cuisinable hors-ligne
-- et peut recevoir ses propres essais. security invoker : le RLS décide de ce qui est copiable.
create function public.copy_recipe(p_recipe_id uuid)
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
    servings, difficulty, source_platform, source_url, forked_from
  )
  select
    auth.uid(), title, description, category, prep_time_minutes, cook_time_minutes,
    servings, difficulty, source_platform, source_url, id
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

-- is_family_member et shares_family_with restent exécutables par anon : le RLS les évalue pour lui aussi
revoke execute on function public.create_family(text) from public, anon;
revoke execute on function public.family_preview(text) from public, anon;
revoke execute on function public.join_family(text) from public, anon;
revoke execute on function public.copy_recipe(uuid) from public, anon;
grant execute on function public.create_family(text) to authenticated;
grant execute on function public.family_preview(text) to authenticated;
grant execute on function public.join_family(text) to authenticated;
grant execute on function public.copy_recipe(uuid) to authenticated;
