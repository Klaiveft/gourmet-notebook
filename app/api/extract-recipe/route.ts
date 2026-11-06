import { NextResponse } from "next/server";
import { extractRecipe } from "@/lib/gemini";
import { ExtractRequestSchema, type ExtractedRecipe, type ExtractResponse, type SourcePlatform } from "@/lib/schemas";
import { detectPlatform, fetchSourceText, youtubeWatchUrl } from "@/lib/sources";
import { createClient } from "@/utils/supabase/server";

// Une vidéo YouTube peut prendre plusieurs dizaines de secondes à analyser
export const maxDuration = 60;

// En dessous, ce n'est qu'un titre ou le texte d'un mur de connexion
const MIN_SOURCE_LENGTH = 40;

const hasRecipe = (recipe: ExtractedRecipe | null): recipe is ExtractedRecipe =>
  !!recipe && recipe.ingredients.length > 0 && recipe.steps.length > 0;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) return NextResponse.json({ error: "Connexion requise" }, { status: 401 });

  const parsed = ExtractRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Requête invalide" }, { status: 400 });

  const { url, text } = parsed.data;
  const target = url ? new URL(url) : null;
  const source_platform: SourcePlatform = target ? detectPlatform(target) : "manual";
  const source = { source_platform, source_url: url ?? null };
  const needsText = (message: string) =>
    NextResponse.json<ExtractResponse>({ status: "needs_text", message, ...source });

  const sourceText = text ?? (target ? await fetchSourceText(target, source_platform) : "");
  let recipe: ExtractedRecipe | null = null;

  // Gemini regarde directement la vidéo : la recette d'un Short est dite à l'oral, pas dans sa description
  const videoUrl = !text && target && source_platform === "youtube" ? youtubeWatchUrl(target) : null;
  if (videoUrl) {
    recipe = await extractRecipe(sourceText, videoUrl).catch((error: unknown) => {
      console.warn("Analyse vidéo impossible, repli sur les métadonnées", error);
      return null;
    });
  }

  if (!hasRecipe(recipe)) {
    if (!text && sourceText.length < MIN_SOURCE_LENGTH) {
      return needsText("Je n'arrive pas à lire ce lien. Colle la légende ou la liste d'ingrédients ci-dessous.");
    }
    try {
      recipe = await extractRecipe(sourceText);
    } catch (error) {
      console.error("Extraction Gemini échouée", error);
      return NextResponse.json({ error: "La lecture de la recette a échoué. Réessaie dans un instant." }, { status: 502 });
    }
  }

  if (!hasRecipe(recipe)) {
    return needsText("Je n'ai pas trouvé de recette ici. Colle la légende ou la liste d'ingrédients ci-dessous.");
  }
  return NextResponse.json<ExtractResponse>({ status: "ok", recipe, ...source });
}
