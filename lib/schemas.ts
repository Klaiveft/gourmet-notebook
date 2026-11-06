import { z } from "zod";

export const CATEGORIES = ["Entrée", "Plat", "Dessert", "Boulangerie", "Sauce & Condiment", "Autre"] as const;
export const DIFFICULTIES = ["Facile", "Moyen", "Difficile"] as const;
export const PLATFORMS = ["youtube", "tiktok", "instagram", "web", "manual"] as const;

export type SourcePlatform = (typeof PLATFORMS)[number];

export const ExtractedRecipeSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  category: z.enum(CATEGORIES),
  prep_time_minutes: z.number().nullable(),
  cook_time_minutes: z.number().nullable(),
  servings: z.number().default(4),
  difficulty: z.enum(DIFFICULTIES),
  ingredients: z.array(
    z.object({
      name: z.string().min(1),
      quantity: z.number().nullable(),
      unit: z.string().nullable(),
      notes: z.string().nullable(),
    }),
  ),
  steps: z.array(
    z.object({
      step_number: z.number(),
      instruction: z.string().min(1),
      duration_minutes: z.number().nullable(),
      tip: z.string().nullable(),
    }),
  ),
});

export type ExtractedRecipe = z.infer<typeof ExtractedRecipeSchema>;

const httpUrl = z.url({ protocol: /^https?$/ });
// Les colonnes sont en integer, or Gemini peut renvoyer 7.5 min
const minutes = z.number().min(0).transform(Math.round).nullable();

export const RecipeInputSchema = z.object({
  title: z.string().trim().min(1, "Donne un titre à la recette"),
  description: z.string().trim().nullable(),
  category: z.enum(CATEGORIES),
  difficulty: z.enum(DIFFICULTIES),
  prep_time_minutes: minutes,
  cook_time_minutes: minutes,
  servings: z.number().min(1, "Au moins 1 personne").transform(Math.round),
  image_url: httpUrl.nullable(),
  source_platform: z.enum(PLATFORMS),
  source_url: httpUrl.nullable(),
  ingredients: z
    .array(
      z.object({
        name: z.string().trim().min(1, "Chaque ingrédient a besoin d'un nom"),
        quantity: z.number().min(0).nullable(),
        unit: z.string().trim().nullable(),
        notes: z.string().trim().nullable(),
      }),
    )
    .min(1, "Ajoute au moins un ingrédient"),
  steps: z
    .array(
      z.object({
        instruction: z.string().trim().min(1, "Une étape est vide"),
        duration_minutes: minutes,
        tip: z.string().trim().nullable(),
      }),
    )
    .min(1, "Ajoute au moins une étape"),
});

export type RecipeFormValues = z.input<typeof RecipeInputSchema>;

export const emptyRecipe: RecipeFormValues = {
  title: "",
  description: null,
  category: "Plat",
  difficulty: "Facile",
  prep_time_minutes: null,
  cook_time_minutes: null,
  servings: 4,
  image_url: null,
  source_platform: "manual",
  source_url: null,
  ingredients: [{ name: "", quantity: null, unit: null, notes: null }],
  steps: [{ instruction: "", duration_minutes: null, tip: null }],
};

export const TrialInputSchema = z
  .object({
    recipe_id: z.uuid(),
    trial_date: z.iso.date(),
    rating: z.number().int().min(1).max(5).nullable(),
    modifications: z.string().trim().nullable(),
    comment: z.string().trim().nullable(),
  })
  .refine((t) => t.rating || t.modifications || t.comment, "Note au moins une étoile ou un commentaire");

export type TrialInput = z.input<typeof TrialInputSchema>;

export const ProfileInputSchema = z.object({
  display_name: z.string().trim().min(1, "Choisis un nom").max(60, "Ce nom est trop long"),
  bio: z.string().trim().max(300, "Ta présentation est trop longue").nullable(),
  avatar_url: httpUrl.nullable(),
});

export type ProfileInput = z.input<typeof ProfileInputSchema>;

export const CommentInputSchema = z.object({
  recipe_id: z.uuid(),
  body: z.string().trim().min(1, "Écris un commentaire").max(1000, "Ce commentaire est trop long"),
});

export const FamilyNameSchema = z.string().trim().min(1, "Donne un nom à ta famille").max(60, "Ce nom est trop long");

export const ExtractRequestSchema = z
  .object({
    url: httpUrl.optional(),
    text: z.string().trim().min(1).max(50_000).optional(),
  })
  .refine((r) => r.url || r.text, "Une URL ou un texte est requis");

export type ExtractResponse =
  | { status: "ok"; recipe: ExtractedRecipe; source_platform: SourcePlatform; source_url: string | null }
  | { status: "needs_text"; message: string; source_platform: SourcePlatform; source_url: string | null };
