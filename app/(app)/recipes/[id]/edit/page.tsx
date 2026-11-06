import { notFound } from "next/navigation";
import { RecipeForm } from "@/components/RecipeForm";
import { getRecipe, requireViewerId } from "@/lib/recipes";
import type { RecipeFormValues } from "@/lib/schemas";

export default async function EditRecipePage({ params }: PageProps<"/recipes/[id]/edit">) {
  const recipe = await getRecipe((await params).id);
  if (!recipe || recipe.user_id !== (await requireViewerId())) notFound();

  const values: RecipeFormValues = {
    title: recipe.title,
    description: recipe.description,
    category: recipe.category,
    difficulty: recipe.difficulty,
    prep_time_minutes: recipe.prep_time_minutes,
    cook_time_minutes: recipe.cook_time_minutes,
    servings: recipe.servings ?? 4,
    image_url: recipe.image_url,
    source_platform: (recipe.source_platform ?? "manual") as RecipeFormValues["source_platform"],
    source_url: recipe.source_url,
    ingredients: recipe.recipe_ingredients.map(({ name, quantity, unit, notes }) => ({ name, quantity, unit, notes })),
    steps: recipe.recipe_steps.map(({ instruction, duration_minutes, tip }) => ({ instruction, duration_minutes, tip })),
  };

  return (
    <>
      <h1 className="mb-5 text-3xl font-semibold">Modifier la recette</h1>
      <RecipeForm initial={values} recipeId={recipe.id} />
    </>
  );
}
