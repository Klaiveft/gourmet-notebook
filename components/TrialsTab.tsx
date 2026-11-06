"use client";

import { Star } from "lucide-react";
import { useState, useTransition } from "react";
import { addTrial } from "@/app/actions";
import type { RecipeFull } from "@/lib/recipes";
import { cn } from "@/lib/utils";

const dateFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "UTC" });

export function TrialsTab({ recipeId, trials }: { recipeId: string; trials: RecipeFull["recipe_trials"] }) {
  const [rating, setRating] = useState<number | null>(null);
  const [modifications, setModifications] = useState("");
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await addTrial({
        recipe_id: recipeId,
        // Date locale : current_date en base est en UTC, donc la veille après minuit à Paris
        trial_date: new Date().toLocaleDateString("en-CA"),
        rating,
        modifications: modifications || null,
        comment: comment || null,
      }).catch(() => ({ error: "Pas de connexion. Ta note reste ici, réessaie une fois en ligne." }));

      if ("error" in result) return setError(result.error);
      setRating(null);
      setModifications("");
      setComment("");
    });
  }

  return (
    <>
      <form onSubmit={submit} className="flex flex-col gap-4 rounded-2xl bg-white p-4">
        <h2 className="text-xl font-semibold">Nouvel essai</h2>

        <div role="radiogroup" aria-label="Ma note" className="flex">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={rating === value}
              aria-label={`${value} sur 5`}
              onClick={() => setRating(rating === value ? null : value)}
              className="btn-icon"
            >
              <Star
                className={cn("size-8", rating && value <= rating ? "fill-terracotta text-terracotta" : "text-espresso/35")}
                aria-hidden
              />
            </button>
          ))}
        </div>

        <div>
          <label htmlFor="modifications" className="label">
            Qu’as-tu modifié aujourd’hui ?
          </label>
          <textarea
            id="modifications"
            rows={3}
            value={modifications}
            onChange={(e) => setModifications(e.target.value)}
            placeholder="Moins de sel, 5 min de cuisson en plus…"
            className="field"
          />
        </div>

        <div>
          <label htmlFor="comment" className="label">
            Verdict
          </label>
          <textarea id="comment" rows={2} value={comment} onChange={(e) => setComment(e.target.value)} className="field" />
        </div>

        {error && (
          <p role="alert" className="text-terracotta-deep font-semibold">
            {error}
          </p>
        )}
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Enregistrement…" : "Noter cet essai"}
        </button>
      </form>

      {trials.length > 0 && (
        <ul className="mt-6 flex flex-col gap-3">
          {trials.map((trial) => (
            <li key={trial.id} className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <time dateTime={trial.trial_date} className="font-serif text-lg font-semibold">
                  {dateFormat.format(new Date(trial.trial_date))}
                </time>
                {trial.rating && (
                  <span className="bg-sage flex items-center gap-1 rounded-full px-2.5 py-0.5 font-bold text-white">
                    <Star className="size-4 fill-white" aria-hidden />
                    {trial.rating}/5
                  </span>
                )}
              </div>
              {trial.modifications && (
                <p className="mt-2">
                  <span className="text-terracotta-deep font-bold">Modifié : </span>
                  {trial.modifications}
                </p>
              )}
              {trial.comment && <p className="text-espresso/80 mt-1">{trial.comment}</p>}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
