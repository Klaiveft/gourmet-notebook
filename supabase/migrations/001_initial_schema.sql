-- Extensions
create extension if not exists "uuid-ossp";

-- Enums
create type recipe_category as enum ('Entrée', 'Plat', 'Dessert', 'Boulangerie', 'Sauce & Condiment', 'Autre');
create type recipe_difficulty as enum ('Facile', 'Moyen', 'Difficile');

-- 1. Profils Utilisateurs
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text,
  avatar_url text,
  preferred_units text default 'metric',
  created_at timestamptz default now()
);

-- 2. Recettes
create table public.recipes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  description text,
  category recipe_category default 'Plat' not null,
  prep_time_minutes integer check (prep_time_minutes >= 0),
  cook_time_minutes integer check (cook_time_minutes >= 0),
  servings integer default 4 check (servings > 0),
  difficulty recipe_difficulty default 'Facile' not null,
  image_url text,
  source_platform text, -- 'youtube', 'tiktok', 'instagram', 'manual'
  source_url text,
  is_favorite boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. Ingrédients
create table public.recipe_ingredients (
  id uuid default gen_random_uuid() primary key,
  recipe_id uuid references public.recipes(id) on delete cascade not null,
  name text not null,
  quantity numeric,
  unit text, -- 'g', 'kg', 'ml', 'cl', 'c. à soupe', 'c. à café', 'pièce', 'pincée'
  notes text, -- ex: 'coupé en dés', 'à température ambiante'
  order_index integer not null default 0
);

-- 4. Étapes de préparation
create table public.recipe_steps (
  id uuid default gen_random_uuid() primary key,
  recipe_id uuid references public.recipes(id) on delete cascade not null,
  step_number integer not null,
  instruction text not null,
  duration_minutes integer, -- Alimente automatiquement le minuteur
  tip text,
  order_index integer not null default 0
);

-- 5. Carnet d'Essais (Notes & ajustements personnels)
create table public.recipe_trials (
  id uuid default gen_random_uuid() primary key,
  recipe_id uuid references public.recipes(id) on delete cascade not null,
  trial_date date default current_date not null,
  rating integer check (rating >= 1 and rating <= 5),
  modifications text, -- ex: "Réduire le sucre à 70g, cuisson à 175°C"
  comment text,
  created_at timestamptz default now()
);

-- Triggers mise à jour updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_recipes_updated_at
before update on public.recipes
for each row execute procedure public.handle_updated_at();

-- Sécurité RLS
alter table public.profiles enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.recipe_steps enable row level security;
alter table public.recipe_trials enable row level security;

-- Politiques RLS hermétiques (accès utilisateur exclusif)
create policy "Users manage own profile" on public.profiles
  for all using (auth.uid() = id);

create policy "Users manage own recipes" on public.recipes
  for all using (auth.uid() = user_id);

create policy "Users manage own ingredients" on public.recipe_ingredients
  for all using (
    exists (select 1 from public.recipes r where r.id = recipe_ingredients.recipe_id and r.user_id = auth.uid())
  );

create policy "Users manage own steps" on public.recipe_steps
  for all using (
    exists (select 1 from public.recipes r where r.id = recipe_steps.recipe_id and r.user_id = auth.uid())
  );

create policy "Users manage own trials" on public.recipe_trials
  for all using (
    exists (select 1 from public.recipes r where r.id = recipe_trials.recipe_id and r.user_id = auth.uid())
  );

-- Storage bucket
insert into storage.buckets (id, name, public)
values ('recipe-images', 'recipe-images', true)
on conflict do nothing;

create policy "Authenticated users upload recipe images"
on storage.objects for insert to authenticated with check (
  bucket_id = 'recipe-images' and (auth.uid())::text = (storage.foldername(name))[1]
);

create policy "Public read for recipe images"
on storage.objects for select to public using (bucket_id = 'recipe-images');
