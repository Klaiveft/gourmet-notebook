// Publie le catalogue éditorial dans le fil général, sous un compte « Le Carnet Gourmand » sans connexion possible.
// Relançable sans doublon : une recette déjà présente, reconnue à son titre, est ignorée.
//
// En local : npm run seed:recipes
// En production : SUPABASE_SECRET_KEY=… NEXT_PUBLIC_SUPABASE_URL=… node supabase/seed/seed-recipes.mjs
import { execSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { parseDurationMinutes } from "../../lib/duration.ts";
import { RECIPES } from "./recipes.mjs";

const BUCKET = "recipe-images";
const EDITORIAL_EMAIL = "editorial@carnet-gourmand.invalid";
const imagesDir = new URL("./images/", import.meta.url);

function localKeys() {
  const status = JSON.parse(execSync("npx supabase status --output json", { encoding: "utf8" }));
  return { url: status.API_URL, key: status.SECRET_KEY };
}

const { url, key } =
  process.env.SUPABASE_SECRET_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL
    ? { url: process.env.NEXT_PUBLIC_SUPABASE_URL, key: process.env.SUPABASE_SECRET_KEY }
    : localKeys();

const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const check = ({ data, error }) => {
  if (error) throw error;
  return data;
};

async function editorialAccount() {
  const { users } = check(await admin.auth.admin.listUsers({ perPage: 1000 }));
  const existing = users.find((user) => user.email === EDITORIAL_EMAIL);
  const id = existing?.id ?? check(await admin.auth.admin.createUser({ email: EDITORIAL_EMAIL, email_confirm: true })).user.id;

  const avatar = `${id}/avatar.webp`;
  check(
    await admin.storage
      .from(BUCKET)
      .upload(avatar, await readFile(new URL("avatar.webp", imagesDir)), { contentType: "image/webp", upsert: true }),
  );
  check(
    await admin
      .from("profiles")
      .update({
        display_name: "Le Carnet Gourmand",
        bio: "Les recettes de la rédaction, pour trouver l'inspiration.",
        avatar_url: admin.storage.from(BUCKET).getPublicUrl(avatar).data.publicUrl,
      })
      .eq("id", id),
  );
  return id;
}

function parseIngredient(line, order_index) {
  const [amount, name, notes] = line.split("|").map((part) => part.trim());
  const match = amount.match(/^([\d.]+)\s*(.*)$/);
  return { name, quantity: match ? Number(match[1]) : null, unit: match?.[2] || null, notes: notes || null, order_index };
}

function parseStep(line, index) {
  const [instruction, tip] = line.split("||").map((part) => part.trim());
  return {
    step_number: index + 1,
    order_index: index,
    instruction,
    tip: tip || null,
    duration_minutes: parseDurationMinutes(instruction),
  };
}

const credits = JSON.parse(await readFile(new URL("credits.json", imagesDir), "utf8"));
const userId = await editorialAccount();
const existing = new Set(check(await admin.from("recipes").select("title").eq("user_id", userId)).map((recipe) => recipe.title));

let added = 0;
for (const recipe of RECIPES) {
  const credit = credits[recipe.slug];
  if (existing.has(recipe.title) || !credit) continue;

  const path = `${userId}/${recipe.slug}.webp`;
  check(
    await admin.storage
      .from(BUCKET)
      .upload(path, await readFile(new URL(`${recipe.slug}.webp`, imagesDir)), { contentType: "image/webp", upsert: true }),
  );

  const { id } = check(
    await admin
      .from("recipes")
      .insert({
        user_id: userId,
        title: recipe.title,
        description: recipe.description,
        category: recipe.category,
        difficulty: recipe.difficulty,
        prep_time_minutes: recipe.prep,
        cook_time_minutes: recipe.cook,
        servings: recipe.servings,
        image_url: admin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl,
        image_credit: credit.text,
        source_platform: "manual",
        is_public: true,
        published_at: new Date().toISOString(),
      })
      .select("id")
      .single(),
  );

  check(await admin.from("recipe_ingredients").insert(recipe.ingredients.map(parseIngredient).map((row) => ({ ...row, recipe_id: id }))));
  check(await admin.from("recipe_steps").insert(recipe.steps.map(parseStep).map((row) => ({ ...row, recipe_id: id }))));
  added++;
}

console.log(`${added} recettes ajoutées, ${existing.size} déjà présentes.`);
