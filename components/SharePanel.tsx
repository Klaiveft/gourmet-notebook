"use client";

import { Bookmark, BookPlus, Check, Globe, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { copyRecipe, setPublic, setShared } from "@/app/actions";
import { cn } from "@/lib/utils";

const OFFLINE = "Pas de connexion. Réessaie une fois en ligne.";

function ErrorMessage({ error }: { error: string | null }) {
  return error ? (
    <p role="alert" className="text-terracotta-deep mt-2 font-semibold">
      {error}
    </p>
  ) : null;
}

/** Pour l'auteur : rendre la recette visible de sa famille, ou la reprendre. */
export function ShareToggle({ recipeId, isShared, hasFamily }: { recipeId: string; isShared: boolean; hasFamily: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!hasFamily) {
    return (
      <Link href="/profile" className="btn-secondary mt-2 w-full">
        <Users className="size-5" aria-hidden />
        Créer ma famille pour partager
      </Link>
    );
  }

  function toggle() {
    setError(null);
    startTransition(async () => {
      const result = await setShared(recipeId, !isShared).catch(() => ({ error: OFFLINE }));
      if ("error" in result) setError(result.error);
    });
  }

  return (
    <>
      <button type="button" onClick={toggle} disabled={pending} aria-pressed={isShared} className="btn-secondary mt-2 w-full">
        {isShared ? <Check className="text-sage size-5" aria-hidden /> : <Users className="size-5" aria-hidden />}
        {isShared ? "Partagée avec ma famille" : "Partager avec ma famille"}
      </button>
      <ErrorMessage error={error} />
    </>
  );
}

type PublishProps = { recipeId: string; isPublic: boolean; hasImage: boolean; authorName: string };

/** Pour l'auteur : apparaître dans le fil général, sous son nom, aux yeux de tous les comptes. */
export function PublishToggle({ recipeId, isPublic, hasImage, authorName }: PublishProps) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const warning = `Publier pour tout le monde ? Cette recette et ta photo seront visibles par toutes les personnes de l’application, sous le nom « ${authorName} ».`;
    if (!isPublic && !confirm(warning)) return;
    setError(null);
    startTransition(async () => {
      const result = await setPublic(recipeId, !isPublic).catch(() => ({ error: OFFLINE }));
      if ("error" in result) setError(result.error);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        disabled={pending || (!hasImage && !isPublic)}
        aria-pressed={isPublic}
        className="btn-secondary mt-2 w-full"
      >
        {isPublic ? <Check className="text-sage size-5" aria-hidden /> : <Globe className="size-5" aria-hidden />}
        {isPublic ? "Publiée pour tout le monde" : "Publier pour tout le monde"}
      </button>
      {!hasImage && !isPublic && <p className="text-espresso/75 mt-1 text-sm">Ajoute une photo pour publier cette recette.</p>}
      <ErrorMessage error={error} />
    </>
  );
}

/** Pour les autres : garder sa propre copie, modifiable et disponible hors-ligne. */
export function CopyButton({ recipeId, copyId }: { recipeId: string; copyId: string | null }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (copyId) {
    return (
      <Link href={`/recipes/${copyId}`} className="btn-secondary mt-2 w-full">
        <Check className="text-sage size-5" aria-hidden />
        Dans mon carnet
      </Link>
    );
  }

  function copy() {
    setError(null);
    startTransition(async () => {
      const result = await copyRecipe(recipeId).catch(() => ({ error: OFFLINE }));
      if ("error" in result) return setError(result.error);
      router.push(`/recipes/${result.id}`);
    });
  }

  return (
    <>
      <button type="button" onClick={copy} disabled={pending} className="btn-secondary mt-2 w-full">
        <BookPlus className="size-5" aria-hidden />
        {pending ? "Ajout…" : "Ajouter à mon carnet"}
      </button>
      <ErrorMessage error={error} />
    </>
  );
}

/** La même copie depuis le fil, sans quitter le swipe. */
export function SaveButton({ recipeId, saved, className }: { recipeId: string; saved: boolean; className?: string }) {
  const [justSaved, setJustSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const isSaved = saved || justSaved;

  function save() {
    startTransition(async () => {
      const result = await copyRecipe(recipeId).catch(() => ({ error: OFFLINE }));
      if (!("error" in result)) setJustSaved(true);
    });
  }

  return (
    <button
      type="button"
      onClick={save}
      disabled={pending || isSaved}
      aria-pressed={isSaved}
      aria-label={isSaved ? "Dans mon carnet" : "Ajouter à mon carnet"}
      className={className}
    >
      <Bookmark className={cn("size-6", isSaved && "fill-white", pending && "animate-pulse")} aria-hidden />
    </button>
  );
}
