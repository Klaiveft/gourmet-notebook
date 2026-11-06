"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import {
  CommentInputSchema,
  FamilyNameSchema,
  ProfileInputSchema,
  RecipeInputSchema,
  TrialInputSchema,
} from "@/lib/schemas";
import { safeNextPath } from "@/lib/utils";
import { createClient } from "@/utils/supabase/server";

export type ActionResult = { error: string } | { ok: true };

const IMAGES_BUCKET = "recipe-images";

const imagePath = (url: string | null | undefined) => url?.split(`/${IMAGES_BUCKET}/`)[1];

async function viewer() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return { supabase, userId: data?.claims.sub ?? null };
}

export async function sendMagicLink(_previous: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const email = z.email().safeParse(formData.get("email"));
  if (!email.success) return { error: "Cette adresse e-mail ne semble pas valide." };

  const origin = (await headers()).get("origin");
  const next = safeNextPath(formData.get("next")?.toString());
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: email.data,
    // `next` est toujours présent : le modèle d'e-mail du README y ajoute ses paramètres avec &
    options: { emailRedirectTo: `${origin}/auth/confirm?next=${encodeURIComponent(next)}` },
  });
  if (error) {
    console.error("Envoi du lien magique", error);
    return { error: "Impossible d'envoyer le lien pour le moment. Réessaie dans une minute." };
  }
  return { ok: true };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
}

export async function saveRecipe(input: unknown, recipeId?: string): Promise<{ error: string } | { id: string }> {
  const parsed = RecipeInputSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { ingredients, steps, ...recipe } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("save_recipe", {
    p_recipe: recipe,
    p_ingredients: ingredients,
    p_steps: steps,
    p_recipe_id: recipeId,
  });
  if (error) {
    console.error("Enregistrement de la recette", error);
    return { error: "La recette n'a pas pu être enregistrée. Réessaie." };
  }
  revalidatePath("/", "layout");
  return { id: data };
}

export async function deleteRecipe(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("recipes").delete().eq("id", id).select("image_url").maybeSingle();
  if (error) return { error: "La recette n'a pas pu être supprimée." };

  const path = imagePath(data?.image_url);
  if (path) {
    const { error: storageError } = await supabase.storage.from(IMAGES_BUCKET).remove([path]);
    if (storageError) console.warn("Photo orpheline", path, storageError);
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function setFavorite(id: string, isFavorite: boolean): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("recipes").update({ is_favorite: isFavorite }).eq("id", id);
  if (error) return { error: "Le favori n'a pas pu être enregistré." };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function addTrial(input: unknown): Promise<ActionResult> {
  const parsed = TrialInputSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.from("recipe_trials").insert(parsed.data);
  if (error) {
    console.error("Enregistrement de l'essai", error);
    return { error: "L'essai n'a pas pu être enregistré. Réessaie." };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function setShared(id: string, isShared: boolean): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("recipes")
    .update({ is_shared: isShared, shared_at: isShared ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) return { error: "Le partage n'a pas pu être modifié." };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function setPublic(id: string, isPublic: boolean): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("recipes")
    .update({ is_public: isPublic, published_at: isPublic ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) return { error: "La publication n'a pas pu être modifiée." };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function setLiked(recipeId: string, liked: boolean): Promise<ActionResult> {
  const { supabase, userId } = await viewer();
  if (!userId) return { error: "Connexion requise" };

  const { error } = liked
    ? await supabase.from("recipe_likes").upsert({ recipe_id: recipeId, user_id: userId }, { ignoreDuplicates: true })
    : await supabase.from("recipe_likes").delete().eq("recipe_id", recipeId).eq("user_id", userId);
  if (error) return { error: "Ton j'aime n'a pas pu être enregistré." };
  // Pas de revalidatePath : le fil se réordonnerait sous le doigt. Les pages sont dynamiques, la navigation suivante est à jour.
  return { ok: true };
}

export async function addComment(input: unknown): Promise<ActionResult> {
  const parsed = CommentInputSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.from("recipe_comments").insert(parsed.data);
  if (error) {
    console.error("Enregistrement du commentaire", error);
    return { error: "Ton commentaire n'a pas pu être envoyé. Réessaie." };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteComment(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("recipe_comments").delete().eq("id", id);
  if (error) return { error: "Le commentaire n'a pas pu être supprimé." };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function copyRecipe(id: string): Promise<{ error: string } | { id: string }> {
  const { supabase, userId } = await viewer();
  if (!userId) return { error: "Connexion requise" };

  const { data: copyId, error } = await supabase.rpc("copy_recipe", { p_recipe_id: id });
  if (error) {
    console.error("Copie de la recette", error);
    return { error: "La recette n'a pas pu être ajoutée à ton carnet." };
  }

  // La photo est dupliquée : l'auteur doit pouvoir supprimer sa recette sans casser les copies
  const { data: source } = await supabase.from("recipes").select("image_url").eq("id", id).maybeSingle();
  const sourcePath = imagePath(source?.image_url);
  if (sourcePath) {
    const bucket = supabase.storage.from(IMAGES_BUCKET);
    const path = `${userId}/${crypto.randomUUID()}.webp`;
    const { error: copyError } = await bucket.copy(sourcePath, path);
    if (copyError) {
      console.warn("Photo non copiée", copyError);
    } else {
      await supabase
        .from("recipes")
        .update({ image_url: bucket.getPublicUrl(path).data.publicUrl })
        .eq("id", copyId)
        .is("image_url", null);
    }
  }

  // Pas de revalidatePath : comme pour un j'aime, enregistrer depuis le fil ne doit pas le réordonner
  return { id: copyId };
}

export async function updateProfile(input: unknown): Promise<ActionResult> {
  const parsed = ProfileInputSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { supabase, userId } = await viewer();
  if (!userId) return { error: "Connexion requise" };

  const { data: previous } = await supabase.from("profiles").select("avatar_url").eq("id", userId).maybeSingle();
  const { error } = await supabase.from("profiles").update(parsed.data).eq("id", userId);
  if (error) {
    console.error("Enregistrement du profil", error);
    return { error: "Ton profil n'a pas pu être enregistré. Réessaie." };
  }

  const oldPath = imagePath(previous?.avatar_url);
  if (oldPath && previous?.avatar_url !== parsed.data.avatar_url) {
    await supabase.storage.from(IMAGES_BUCKET).remove([oldPath]);
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function createFamily(name: string): Promise<ActionResult> {
  const parsed = FamilyNameSchema.safeParse(name);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_family", { p_name: parsed.data });
  if (error) {
    console.error("Création de la famille", error);
    return { error: "La famille n'a pas pu être créée. Réessaie." };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function joinFamily(code: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("join_family", { p_code: code });
  if (error) return { error: "Cette invitation n'est pas valable. Demande un nouveau lien." };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function removeFamilyMember(familyId: string, memberId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("family_members").delete().eq("family_id", familyId).eq("user_id", memberId);
  if (error) return { error: "Le changement n'a pas pu être enregistré." };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function renewInviteCode(familyId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("families")
    .update({ invite_code: crypto.randomUUID().replaceAll("-", "").slice(0, 12) })
    .eq("id", familyId);
  if (error) return { error: "Le lien n'a pas pu être renouvelé." };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteFamily(familyId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("families").delete().eq("id", familyId);
  if (error) return { error: "La famille n'a pas pu être supprimée." };
  revalidatePath("/", "layout");
  return { ok: true };
}
