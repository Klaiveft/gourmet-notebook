"use client";

import { ArrowLeft, ChefHat, Clock, ExternalLink, Flame, Heart, Lightbulb, Pencil, Trash2, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { deleteRecipe, setFavorite } from "@/app/actions";
import { Avatar, displayName } from "@/components/Avatar";
import { CommentsSection } from "@/components/CommentsSection";
import { KitchenModeModal } from "@/components/KitchenModeModal";
import { LikeButton } from "@/components/LikeButton";
import { CopyButton, PublishToggle, ShareToggle } from "@/components/SharePanel";
import { TrialsTab } from "@/components/TrialsTab";
import { cachePage, forgetPage } from "@/lib/offline";
import type { RecipeFull } from "@/lib/recipes";
import { cn, formatQuantity, storageImage } from "@/lib/utils";

const OWNER_TABS = ["Ingrédients", "Étapes", "Mes Essais & Notes"] as const;
const FAMILY_TABS = ["Ingrédients", "Étapes"] as const;
const OFFLINE_ERROR = "Pas de connexion pour le moment. Réessaie une fois en ligne.";

type Props = {
  recipe: RecipeFull;
  viewerId: string;
  hasFamily: boolean;
  copyId: string | null;
};

export function RecipeDetail({ recipe, viewerId, hasFamily, copyId }: Props) {
  const router = useRouter();
  const isOwner = recipe.user_id === viewerId;
  const tabs = isOwner ? OWNER_TABS : FAMILY_TABS;
  const [tab, setTab] = useState<(typeof OWNER_TABS)[number]>("Ingrédients");
  const [favorite, setFavoriteState] = useState(recipe.is_favorite ?? false);
  const [kitchenOpen, setKitchenOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const path = `/recipes/${recipe.id}`;
  const image = storageImage(recipe.image_url);
  const isSocial = recipe.is_shared || recipe.is_public;

  // Se relance à chaque rafraîchissement des données, pour que la copie hors-ligne suive les modifications
  useEffect(() => {
    void cachePage(path);
  }, [path, recipe]);

  function toggleFavorite() {
    const next = !favorite;
    setFavoriteState(next);
    startTransition(async () => {
      const result = await setFavorite(recipe.id, next).catch(() => ({ error: OFFLINE_ERROR }));
      if ("error" in result) {
        setFavoriteState(!next);
        setError(result.error);
      }
    });
  }

  function remove() {
    const warning = isSocial ? " Plus personne ne la verra." : "";
    if (!confirm(`Supprimer « ${recipe.title} » et tous ses essais ?${warning}`)) return;
    startTransition(async () => {
      const result = await deleteRecipe(recipe.id).catch(() => ({ error: OFFLINE_ERROR }));
      if ("error" in result) return setError(result.error);
      await forgetPage(path);
      router.push("/recipes");
    });
  }

  return (
    <article>
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          // Le fil retient sa position : revenir en arrière ramène sur la recette qu'on regardait
          onClick={() => (window.history.length > 1 ? router.back() : router.push(isOwner ? "/recipes" : "/"))}
          aria-label="Retour"
          className="btn-icon -ml-3"
        >
          <ArrowLeft className="size-6" aria-hidden />
        </button>
        {isOwner && (
          <div className="flex">
            <button
              type="button"
              onClick={toggleFavorite}
              aria-pressed={favorite}
              aria-label={favorite ? "Retirer des favoris" : "Ajouter aux favoris"}
              className="btn-icon"
            >
              <Heart className={cn("size-6", favorite && "fill-terracotta text-terracotta")} aria-hidden />
            </button>
            <Link href={`${path}/edit`} aria-label="Modifier la recette" className="btn-icon">
              <Pencil className="size-6" aria-hidden />
            </Link>
            <button type="button" onClick={remove} disabled={pending} aria-label="Supprimer la recette" className="btn-icon">
              <Trash2 className="size-6" aria-hidden />
            </button>
          </div>
        )}
      </div>

      {image && (
        <div className="bg-cream-deep relative aspect-[16/10] overflow-hidden rounded-2xl">
          <Image src={image} alt="" fill priority sizes="(min-width: 672px) 640px, 100vw" className="object-cover" />
        </div>
      )}
      {recipe.image_credit && (
        <Link href="/credits" className="text-espresso/70 mt-1 block text-xs underline">
          {recipe.image_credit}
        </Link>
      )}

      <h1 className="mt-4 text-3xl leading-tight font-semibold">{recipe.title}</h1>

      {!isOwner && (
        <Link href={`/profile/${recipe.user_id}`} className="mt-1 flex min-h-12 items-center gap-2.5 font-semibold">
          <Avatar person={recipe.profiles} size="sm" />
          {displayName(recipe.profiles)}
        </Link>
      )}

      {recipe.description && <p className="text-espresso/80 mt-2">{recipe.description}</p>}

      <ul className="text-espresso/80 mt-3 flex flex-wrap gap-x-4 gap-y-1 font-semibold">
        {recipe.prep_time_minutes !== null && (
          <li className="flex items-center gap-1">
            <Clock className="size-4" aria-hidden />
            {recipe.prep_time_minutes} min de préparation
          </li>
        )}
        {recipe.cook_time_minutes !== null && (
          <li className="flex items-center gap-1">
            <Flame className="size-4" aria-hidden />
            {recipe.cook_time_minutes} min de cuisson
          </li>
        )}
        <li className="flex items-center gap-1">
          <Users className="size-4" aria-hidden />
          {recipe.servings} pers.
        </li>
        <li>{recipe.difficulty}</li>
      </ul>

      {recipe.source_url && (
        <a
          href={recipe.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sage mt-1 inline-flex min-h-12 items-center gap-1 font-semibold underline"
        >
          Voir la source
          <ExternalLink className="size-4" aria-hidden />
        </a>
      )}

      {error && (
        <p role="alert" className="text-terracotta-deep mt-3 font-semibold">
          {error}
        </p>
      )}

      {recipe.recipe_steps.length > 0 && (
        <button type="button" onClick={() => setKitchenOpen(true)} className="btn-primary mt-4 w-full">
          <ChefHat className="size-6" aria-hidden />
          Mode Cuisine
        </button>
      )}

      {isOwner ? (
        <>
          <ShareToggle recipeId={recipe.id} isShared={recipe.is_shared} hasFamily={hasFamily} />
          <PublishToggle
            recipeId={recipe.id}
            isPublic={recipe.is_public}
            hasImage={!!image}
            authorName={displayName(recipe.profiles)}
          />
        </>
      ) : (
        <CopyButton recipeId={recipe.id} copyId={copyId} />
      )}

      {isSocial && (
        <div className="mt-1">
          <LikeButton
            recipeId={recipe.id}
            liked={recipe.recipe_likes.some((like) => like.user_id === viewerId)}
            count={recipe.recipe_likes.length}
          />
        </div>
      )}

      <div role="tablist" className="border-espresso/10 mt-5 flex border-b">
        {tabs.map((name) => (
          <button
            key={name}
            type="button"
            role="tab"
            aria-selected={tab === name}
            onClick={() => setTab(name)}
            className={cn(
              "min-h-12 flex-1 border-b-2 px-1 text-sm leading-tight font-bold",
              tab === name ? "border-terracotta text-terracotta-deep" : "text-espresso/70 border-transparent",
            )}
          >
            {name}
          </button>
        ))}
      </div>

      <div role="tabpanel" className="pt-4">
        {tab === "Ingrédients" && (
          <ul className="divide-espresso/10 divide-y">
            {recipe.recipe_ingredients.map((ingredient) => (
              <li key={ingredient.id} className="flex justify-between gap-4 py-3 text-lg">
                <span>
                  {ingredient.name}
                  {ingredient.notes && <span className="text-espresso/70 block text-base">{ingredient.notes}</span>}
                </span>
                <span className="shrink-0 font-bold">{formatQuantity(ingredient.quantity, ingredient.unit)}</span>
              </li>
            ))}
          </ul>
        )}

        {tab === "Étapes" && (
          <ol className="flex flex-col gap-5">
            {recipe.recipe_steps.map((step, index) => (
              <li key={step.id} className="flex gap-3">
                <span className="bg-sage flex size-8 shrink-0 items-center justify-center rounded-full font-bold text-white">
                  {index + 1}
                </span>
                <div className="text-lg">
                  <p>{step.instruction}</p>
                  {step.tip && (
                    <p className="text-sage mt-1 flex gap-1.5 text-base font-semibold">
                      <Lightbulb className="mt-0.5 size-4 shrink-0" aria-hidden />
                      {step.tip}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}

        {tab === "Mes Essais & Notes" && <TrialsTab recipeId={recipe.id} trials={recipe.recipe_trials} />}
      </div>

      {isSocial && (
        <CommentsSection recipeId={recipe.id} comments={recipe.recipe_comments} viewerId={viewerId} isRecipeOwner={isOwner} />
      )}

      {kitchenOpen && <KitchenModeModal recipe={recipe} onClose={() => setKitchenOpen(false)} />}
    </article>
  );
}
