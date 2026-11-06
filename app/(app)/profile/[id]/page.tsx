import { notFound, redirect } from "next/navigation";
import { ProfileHeader } from "@/components/ProfileHeader";
import { RecipeCard } from "@/components/RecipeCard";
import { getProfile, getProfileRecipes, requireViewerId } from "@/lib/recipes";

export default async function MemberProfilePage({ params }: PageProps<"/profile/[id]">) {
  const { id } = await params;
  if (id === (await requireViewerId())) redirect("/profile");

  // Le RLS ne laisse lire que les membres de mes familles
  const profile = await getProfile(id);
  if (!profile) notFound();
  const recipes = await getProfileRecipes(id);

  return (
    <>
      <ProfileHeader
        profile={profile}
        stats={[
          { label: "Recettes partagées", value: recipes.length },
          { label: "J’aime reçus", value: recipes.reduce((total, recipe) => total + recipe.recipe_likes.length, 0) },
        ]}
      />
      <section className="mt-7">
        <h2 className="mb-3 text-xl font-semibold">Ses recettes</h2>
        {recipes.length === 0 ? (
          <p className="text-espresso/75">Aucune recette partagée pour le moment.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {recipes.map((recipe) => (
              <li key={recipe.id}>
                <RecipeCard recipe={{ ...recipe, is_favorite: false }} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
