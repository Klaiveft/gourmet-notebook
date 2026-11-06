import { notFound } from "next/navigation";
import { RecipeDetail } from "@/components/RecipeDetail";
import { getFamilies, getMyCopyId, getRecipe, requireViewerId } from "@/lib/recipes";

export default async function RecipePage({ params }: PageProps<"/recipes/[id]">) {
  const { id } = await params;
  const viewerId = await requireViewerId();
  const recipe = await getRecipe(id);
  if (!recipe) notFound();

  const isOwner = recipe.user_id === viewerId;
  const [families, copyId] = await Promise.all([isOwner ? getFamilies() : [], isOwner ? null : getMyCopyId(id, viewerId)]);

  return <RecipeDetail recipe={recipe} viewerId={viewerId} hasFamily={families.length > 0} copyId={copyId} />;
}
