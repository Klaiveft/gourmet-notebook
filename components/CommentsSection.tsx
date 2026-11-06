"use client";

import { Send, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { addComment, deleteComment } from "@/app/actions";
import { Avatar, displayName } from "@/components/Avatar";
import type { RecipeFull } from "@/lib/recipes";

const dateFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeZone: "UTC" });

type Props = {
  recipeId: string;
  comments: RecipeFull["recipe_comments"];
  viewerId: string;
  isRecipeOwner: boolean;
};

export function CommentsSection({ recipeId, comments, viewerId, isRecipeOwner }: Props) {
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await addComment({ recipe_id: recipeId, body }).catch(() => ({
        error: "Pas de connexion. Ton commentaire reste ici, réessaie une fois en ligne.",
      }));
      if ("error" in result) return setError(result.error);
      setBody("");
    });
  }

  function remove(id: string) {
    if (!confirm("Supprimer ce commentaire ?")) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteComment(id).catch(() => ({ error: "Pas de connexion. Réessaie une fois en ligne." }));
      if ("error" in result) setError(result.error);
    });
  }

  return (
    <section id="commentaires" className="mt-8 scroll-mt-4">
      <h2 className="mb-3 text-xl font-semibold">Commentaires ({comments.length})</h2>

      <ul className="flex flex-col gap-3">
        {comments.map((comment) => (
          <li key={comment.id} className="flex gap-2.5">
            <Link href={`/profile/${comment.user_id}`} aria-label={displayName(comment.profiles)}>
              <Avatar person={comment.profiles} size="sm" />
            </Link>
            <div className="min-w-0 flex-1 rounded-2xl bg-white px-3 py-2">
              <p className="font-bold">
                {displayName(comment.profiles)}
                <span className="text-espresso/70 ml-2 text-sm font-normal">{dateFormat.format(new Date(comment.created_at))}</span>
              </p>
              <p className="break-words whitespace-pre-line">{comment.body}</p>
            </div>
            {(comment.user_id === viewerId || isRecipeOwner) && (
              <button
                type="button"
                aria-label="Supprimer ce commentaire"
                disabled={pending}
                onClick={() => remove(comment.id)}
                className="btn-icon"
              >
                <Trash2 className="size-5" aria-hidden />
              </button>
            )}
          </li>
        ))}
      </ul>

      <form onSubmit={submit} className="mt-3 flex items-end gap-2">
        <textarea
          aria-label="Écrire un commentaire"
          rows={2}
          required
          maxLength={1000}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Un mot pour la famille…"
          className="field"
        />
        <button type="submit" disabled={pending} aria-label="Envoyer" className="btn-icon bg-terracotta text-white disabled:opacity-60">
          <Send className="size-5" aria-hidden />
        </button>
      </form>
      {error && (
        <p role="alert" className="text-terracotta-deep mt-2 font-semibold">
          {error}
        </p>
      )}
    </section>
  );
}
