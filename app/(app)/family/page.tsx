import { ChefHat, MessageCircle, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Avatar, displayName } from "@/components/Avatar";
import { FeedTabs } from "@/components/FeedTabs";
import { LikeButton } from "@/components/LikeButton";
import { RecipeRow } from "@/components/RecipeCard";
import { buildForYou } from "@/lib/forYou";
import { getFamilyRecipes, requireViewerId, type FamilyRecipe } from "@/lib/recipes";
import { storageImage, timeAgo } from "@/lib/utils";

const monthFormat = new Intl.DateTimeFormat("fr-FR", { month: "long", timeZone: "Europe/Paris" });

function Author({ recipe, detail }: { recipe: FamilyRecipe; detail?: string }) {
  return (
    <Link href={`/profile/${recipe.user_id}`} className="flex min-h-12 items-center gap-2.5">
      <Avatar person={recipe.profiles} size="sm" />
      <span className="leading-tight">
        <span className="block font-bold">{displayName(recipe.profiles)}</span>
        {detail && <span className="text-espresso/70 block text-sm">{detail}</span>}
      </span>
    </Link>
  );
}

function Reactions({ recipe, viewerId }: { recipe: FamilyRecipe; viewerId: string }) {
  return (
    <div className="flex items-center gap-4">
      <LikeButton
        recipeId={recipe.id}
        liked={recipe.recipe_likes.some((like) => like.user_id === viewerId)}
        count={recipe.recipe_likes.length}
      />
      <Link
        href={`/recipes/${recipe.id}#commentaires`}
        aria-label={`${recipe.recipe_comments.length} commentaires`}
        className="inline-flex min-h-12 min-w-12 items-center gap-1.5 font-bold"
      >
        <MessageCircle className="size-6" aria-hidden />
        {recipe.recipe_comments.length}
      </Link>
    </div>
  );
}

function Photo({ recipe, sizes, priority }: { recipe: FamilyRecipe; sizes: string; priority?: boolean }) {
  const image = storageImage(recipe.image_url);
  return image ? (
    <Image src={image} alt="" fill sizes={sizes} priority={priority} className="object-cover" />
  ) : (
    <ChefHat className="text-sage-light absolute inset-0 m-auto size-14" aria-hidden />
  );
}

export default async function FamilyFeedPage() {
  const viewerId = await requireViewerId();
  const recipes = await getFamilyRecipes(viewerId);
  const now = new Date();
  const { hero, seasonal, feed, remake } = buildForYou(recipes, viewerId, now);

  return (
    <>
      <FeedTabs />
      <h1 className="mt-3 mb-5 text-3xl font-semibold">Ma famille</h1>

      {hero && (
        <section aria-label="La recette du moment" className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <Link href={`/recipes/${hero.id}`} className="block">
            <div className="bg-cream-deep relative aspect-[16/10]">
              <Photo recipe={hero} sizes="(min-width: 672px) 640px, 100vw" priority />
              <span className="bg-terracotta-deep absolute top-3 left-3 rounded-full px-3 py-1 text-sm font-bold text-white">
                La recette du moment
              </span>
            </div>
            <h2 className="px-4 pt-3 text-2xl leading-tight font-semibold">{hero.title}</h2>
          </Link>
          <div className="flex items-center justify-between gap-2 px-4 pb-1">
            <Author recipe={hero} />
            <Reactions recipe={hero} viewerId={viewerId} />
          </div>
        </section>
      )}

      <RecipeRow title={`De saison en ${monthFormat.format(now)}`} recipes={seasonal} />
      <RecipeRow title="À refaire" recipes={remake} />

      {feed.length > 0 && (
        <section className="mt-7">
          <h2 className="mb-3 text-xl font-semibold">Le fil de la famille</h2>
          <ul className="flex flex-col gap-4">
            {feed.map((recipe) => (
              <li key={recipe.id} className="overflow-hidden rounded-2xl bg-white shadow-sm">
                <div className="px-3 pt-1">
                  <Author recipe={recipe} detail={timeAgo(recipe.shared_at ?? recipe.created_at ?? now.toISOString(), now)} />
                </div>
                <Link href={`/recipes/${recipe.id}`} className="block">
                  <div className="bg-cream-deep relative mt-1 aspect-[16/10]">
                    <Photo recipe={recipe} sizes="(min-width: 672px) 640px, 100vw" />
                  </div>
                  <h3 className="px-4 pt-3 text-lg leading-snug font-semibold">{recipe.title}</h3>
                </Link>
                <div className="px-4 pb-1">
                  <Reactions recipe={recipe} viewerId={viewerId} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!hero && feed.length === 0 && (
        <div className="mt-7 rounded-2xl bg-white p-6 text-center">
          <Users className="text-sage mx-auto mb-3 size-10" aria-hidden />
          <p className="text-lg font-semibold">Le fil de ta famille est encore vide</p>
          <p className="text-espresso/75 mt-1 mb-4">Invite tes proches, et partagez vos meilleures recettes.</p>
          <Link href="/profile" className="btn-primary">
            Ma famille
          </Link>
        </div>
      )}
    </>
  );
}
