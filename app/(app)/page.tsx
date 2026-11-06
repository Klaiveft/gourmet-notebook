import { Clock, Leaf, MessageCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Avatar, displayName } from "@/components/Avatar";
import { FeedScroller } from "@/components/FeedScroller";
import { FeedTabs } from "@/components/FeedTabs";
import { LikeButton } from "@/components/LikeButton";
import { SaveButton } from "@/components/SharePanel";
import { buildGeneralFeed } from "@/lib/forYou";
import { getMyFeedSignals, getPublicFeed, requireViewerId, type PublicRecipe } from "@/lib/recipes";
import { storageImage } from "@/lib/utils";

const RAIL_BUTTON = "flex size-14 flex-col items-center justify-center text-sm font-bold drop-shadow";

type SlideProps = {
  recipe: PublicRecipe;
  inSeason: boolean;
  viewerId: string;
  saved: boolean;
  first: boolean;
};

function Slide({ recipe, inSeason, viewerId, saved, first }: SlideProps) {
  const image = storageImage(recipe.image_url);
  const minutes = (recipe.prep_time_minutes ?? 0) + (recipe.cook_time_minutes ?? 0);

  return (
    <li className="relative h-full snap-start snap-always overflow-hidden bg-black">
      <Link href={`/recipes/${recipe.id}`} aria-label={`Voir la recette : ${recipe.title}`} className="absolute inset-0">
        {image && (
          // Une photo paysage s'agrandit pour remplir la hauteur : `sizes` doit couvrir cette largeur, pas celle de l'écran
          <Image src={image} alt="" fill priority={first} sizes="(min-width: 512px) 1400px, 300vw" className="object-cover" />
        )}
        <span className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/50 to-transparent" />
        <span className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
      </Link>

      {/* pointer-events-none : un appui sur le texte ouvre la recette en dessous */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end gap-2 pr-1 pb-3 pl-4 text-white">
        <div className="min-w-0 flex-1">
          {inSeason && (
            <span className="bg-sage mb-2 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-sm font-bold">
              <Leaf className="size-3.5" aria-hidden />
              De saison
            </span>
          )}
          <h2 className="text-3xl leading-tight font-semibold drop-shadow">{recipe.title}</h2>
          <p className="mt-1 flex flex-wrap items-center gap-x-1.5 font-semibold">
            {minutes > 0 && (
              <>
                <Clock className="size-4" aria-hidden />
                {minutes} min ·
              </>
            )}{" "}
            {recipe.difficulty} · {recipe.category}
          </p>
          <Link
            href={`/profile/${recipe.user_id}`}
            className="pointer-events-auto mt-1 inline-flex min-h-12 items-center gap-2 font-bold"
          >
            <Avatar person={recipe.profiles} size="sm" />
            {displayName(recipe.profiles)}
          </Link>
          {recipe.image_credit && <p className="line-clamp-1 text-xs text-white/80">{recipe.image_credit}</p>}
        </div>

        <div className="pointer-events-auto flex flex-col items-center gap-1">
          <LikeButton
            recipeId={recipe.id}
            liked={recipe.recipe_likes.some((like) => like.user_id === viewerId)}
            count={recipe.recipe_likes.length}
            className={RAIL_BUTTON}
          />
          <Link
            href={`/recipes/${recipe.id}#commentaires`}
            aria-label={`${recipe.recipe_comments.length} commentaires`}
            className={RAIL_BUTTON}
          >
            <MessageCircle className="size-6" aria-hidden />
            {recipe.recipe_comments.length}
          </Link>
          <SaveButton recipeId={recipe.id} saved={saved} className={RAIL_BUTTON} />
        </div>
      </div>
    </li>
  );
}

export default async function ForYouPage() {
  const viewerId = await requireViewerId();
  const [recipes, mine] = await Promise.all([getPublicFeed(viewerId), getMyFeedSignals(viewerId)]);
  const feed = buildGeneralFeed(recipes, mine.map((recipe) => recipe.category), viewerId, new Date());
  const saved = new Set(mine.map((recipe) => recipe.forked_from));

  return (
    <div className="fixed inset-x-0 top-0 bottom-[calc(4rem+1px+env(safe-area-inset-bottom))] z-30 bg-black">
      <h1 className="sr-only">Pour toi</h1>
      <div className="absolute inset-x-0 top-0 z-10 pt-[env(safe-area-inset-top)]">
        <FeedTabs overlay />
      </div>

      {feed.length === 0 ? (
        <p className="flex h-full items-center justify-center p-6 text-center text-lg text-white">
          Aucune recette publiée pour le moment. Lance `npm run seed:recipes`.
        </p>
      ) : (
        <FeedScroller>
          {feed.map(({ recipe, inSeason }, index) => (
            <Slide
              key={recipe.id}
              recipe={recipe}
              inSeason={inSeason}
              viewerId={viewerId}
              saved={saved.has(recipe.id)}
              first={index === 0}
            />
          ))}
          <li className="flex h-full snap-start snap-always flex-col items-center justify-center gap-5 bg-black p-6 text-center text-white">
            <p className="font-serif text-3xl font-semibold">Tu as tout vu pour aujourd’hui !</p>
            <p className="text-lg text-white/80">De nouvelles suggestions t’attendent demain.</p>
            <Link href="/add" className="btn-primary">
              Ajouter ma recette
            </Link>
          </li>
        </FeedScroller>
      )}
    </div>
  );
}
