import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

const PERSON = "profiles(id, display_name, avatar_url)";
// recipe_likes crée un second chemin vers profiles : il faut nommer celui de l'auteur
const RECIPE_AUTHOR = "profiles!recipes_user_profile_fk(id, display_name, avatar_url)";

export async function requireViewerId() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login");
  return data.claims.sub;
}

/** Le carnet personnel. Le filtre est indispensable : le RLS laisse aussi passer les recettes de la famille. */
export async function getRecipes(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recipes")
    .select(
      "id, title, category, difficulty, prep_time_minutes, cook_time_minutes, image_url, is_favorite, recipe_ingredients(name)",
    )
    .eq("user_id", userId)
    .order("title");
  if (error) throw error;
  return data;
}

export async function getRecipe(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recipes")
    .select(
      `*, ${RECIPE_AUTHOR}, recipe_ingredients(*), recipe_steps(*), recipe_trials(*), recipe_likes(user_id),
       recipe_comments(id, body, created_at, user_id, ${PERSON})`,
    )
    .eq("id", id)
    .order("order_index", { referencedTable: "recipe_ingredients" })
    .order("order_index", { referencedTable: "recipe_steps" })
    .order("trial_date", { referencedTable: "recipe_trials", ascending: false })
    .order("created_at", { referencedTable: "recipe_trials", ascending: false })
    .order("created_at", { referencedTable: "recipe_comments" })
    .maybeSingle();
  // 22P02 : l'identifiant de l'URL n'est pas un uuid, donc la recette n'existe pas
  if (error && error.code !== "22P02") throw error;
  return data;
}

/** Ma copie d'une recette de la famille, si je l'ai déjà ajoutée à mon carnet. */
export async function getMyCopyId(recipeId: string, userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("recipes")
    .select("id")
    .eq("user_id", userId)
    .eq("forked_from", recipeId)
    .maybeSingle();
  return data?.id ?? null;
}

/** Mon carnet et ce que ma famille partage. Le filtre écarte les recettes publiques d'inconnus, que le RLS laisse passer. */
export async function getFamilyRecipes(userId: string) {
  const supabase = await createClient();
  const { data: members, error: membersError } = await supabase.from("family_members").select("user_id");
  if (membersError) throw membersError;

  const { data, error } = await supabase
    .from("recipes")
    .select(
      `id, user_id, title, category, image_url, is_shared, is_public, shared_at, created_at, forked_from,
       prep_time_minutes, cook_time_minutes, ${RECIPE_AUTHOR}, recipe_ingredients(name), recipe_likes(user_id),
       recipe_comments(id), recipe_trials(rating, trial_date)`,
    )
    .in("user_id", [userId, ...members.map((member) => member.user_id)])
    .order("created_at", { ascending: false })
    // shortcut: le classement se fait en mémoire, à passer en SQL au-delà de quelques centaines de recettes
    .limit(300);
  if (error) throw error;
  return data;
}

/** Le fil général. Une recette sans photo n'y a pas sa place : l'image est tout l'intérêt de ce fil. */
export async function getPublicFeed(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recipes")
    .select(
      `id, user_id, title, category, difficulty, image_url, image_credit, published_at, prep_time_minutes,
       cook_time_minutes, ${RECIPE_AUTHOR}, recipe_ingredients(name), recipe_likes(user_id), recipe_comments(id)`,
    )
    .eq("is_public", true)
    .neq("user_id", userId)
    .not("image_url", "is", null)
    .order("published_at", { ascending: false })
    // shortcut: classement en mémoire sur les 200 dernières, à paginer en SQL quand le catalogue grandira
    .limit(200);
  if (error) throw error;
  return data;
}

/** Mes goûts et ce que j'ai déjà gardé, pour personnaliser le fil général. */
export async function getMyFeedSignals(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("recipes").select("category, forked_from").eq("user_id", userId);
  if (error) throw error;
  return data;
}

export async function getProfile(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
  // 22P02 : l'identifiant de l'URL n'est pas un uuid
  if (error && error.code !== "22P02") throw error;
  return data;
}

/** Les recettes d'une personne, limitées par le RLS à ce que je peux voir d'elle. */
export async function getProfileRecipes(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recipes")
    .select(
      "id, title, category, prep_time_minutes, cook_time_minutes, image_url, is_favorite, is_shared, is_public, recipe_likes(user_id), recipe_trials(id)",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getFamilies() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("families")
    .select(`id, name, invite_code, created_by, family_members(joined_at, ${PERSON})`)
    .order("created_at")
    .order("joined_at", { referencedTable: "family_members" });
  if (error) throw error;
  return data;
}

export type RecipeListItem = Awaited<ReturnType<typeof getRecipes>>[number];
export type RecipeFull = NonNullable<Awaited<ReturnType<typeof getRecipe>>>;
export type FamilyRecipe = Awaited<ReturnType<typeof getFamilyRecipes>>[number];
export type PublicRecipe = Awaited<ReturnType<typeof getPublicFeed>>[number];
export type Family = Awaited<ReturnType<typeof getFamilies>>[number];
export type Profile = NonNullable<Awaited<ReturnType<typeof getProfile>>>;
