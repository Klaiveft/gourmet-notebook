"use client";

import { Heart } from "lucide-react";
import { useState, useTransition } from "react";
import { setLiked } from "@/app/actions";
import { cn } from "@/lib/utils";

type Props = { recipeId: string; liked: boolean; count: number; className?: string };

export function LikeButton({ recipeId, liked, count, className }: Props) {
  // État local : l'action ne recharge pas la page, sinon le fil se réordonnerait en plein swipe
  const [state, setState] = useState({ liked, count });
  const [pending, startTransition] = useTransition();

  function toggle() {
    const previous = state;
    const next = !state.liked;
    setState({ liked: next, count: state.count + (next ? 1 : -1) });
    startTransition(async () => {
      const result = await setLiked(recipeId, next).catch(() => ({ error: "Hors-ligne" }));
      if ("error" in result) setState(previous);
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={state.liked}
      aria-label={`J’aime, ${state.count} au total`}
      className={className ?? "inline-flex min-h-12 min-w-12 items-center gap-1.5 font-bold"}
    >
      <Heart className={cn("size-6", state.liked && "fill-terracotta text-terracotta")} aria-hidden />
      {state.count}
    </button>
  );
}
