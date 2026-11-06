import { FamilyPanel } from "@/components/FamilyPanel";
import { ProfileEditor } from "@/components/ProfileEditor";
import { ProfileHeader } from "@/components/ProfileHeader";
import { RecipeRow } from "@/components/RecipeCard";
import { SignOutButton } from "@/components/SignOutButton";
import { getFamilies, getProfile, getProfileRecipes, requireViewerId } from "@/lib/recipes";

export default async function ProfilePage() {
  const viewerId = await requireViewerId();
  const [profile, recipes, families] = await Promise.all([getProfile(viewerId), getProfileRecipes(viewerId), getFamilies()]);
  const shared = recipes.filter((recipe) => recipe.is_shared || recipe.is_public);

  return (
    <>
      <ProfileHeader
        profile={profile}
        stats={[
          { label: "Recettes", value: recipes.length },
          { label: "Partagées", value: shared.length },
          { label: "Essais", value: recipes.reduce((total, recipe) => total + recipe.recipe_trials.length, 0) },
          { label: "J’aime reçus", value: shared.reduce((total, recipe) => total + recipe.recipe_likes.length, 0) },
        ]}
      />
      {profile && <ProfileEditor profile={profile} />}
      <FamilyPanel families={families} viewerId={viewerId} />
      <RecipeRow title="Mes recettes partagées" recipes={shared} />
      <RecipeRow title="Mes favoris" recipes={recipes.filter((recipe) => recipe.is_favorite)} />
      <SignOutButton />
    </>
  );
}
