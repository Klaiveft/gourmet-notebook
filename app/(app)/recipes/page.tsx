import { RecipeBrowser } from "@/components/RecipeBrowser";
import { getRecipes, requireViewerId } from "@/lib/recipes";

export default async function RecipesPage() {
  const recipes = await getRecipes(await requireViewerId());

  return (
    <>
      <h1 className="mb-5 text-3xl font-semibold">Mes Recettes</h1>
      <RecipeBrowser recipes={recipes} />
    </>
  );
}
