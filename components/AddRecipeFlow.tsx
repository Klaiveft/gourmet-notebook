"use client";

import { ClipboardPaste, Link2, Loader2, PenLine, Sparkles, Text } from "lucide-react";
import { useRef, useState } from "react";
import { RecipeForm } from "@/components/RecipeForm";
import { emptyRecipe, type ExtractResponse, type RecipeFormValues } from "@/lib/schemas";
import { cn } from "@/lib/utils";

const MODES = [
  { id: "link", label: "Un lien", icon: Link2 },
  { id: "text", label: "Un texte", icon: Text },
  { id: "manual", label: "À la main", icon: PenLine },
] as const;

type Mode = (typeof MODES)[number]["id"];

function toFormValues(response: Extract<ExtractResponse, { status: "ok" }>): RecipeFormValues {
  const { recipe, source_platform, source_url } = response;
  return {
    title: recipe.title,
    description: recipe.description ?? null,
    category: recipe.category,
    difficulty: recipe.difficulty,
    prep_time_minutes: recipe.prep_time_minutes,
    cook_time_minutes: recipe.cook_time_minutes,
    servings: recipe.servings,
    image_url: null,
    source_platform,
    source_url,
    ingredients: recipe.ingredients,
    steps: recipe.steps.map(({ instruction, duration_minutes, tip }) => ({ instruction, duration_minutes, tip })),
  };
}

export function AddRecipeFlow() {
  const [mode, setMode] = useState<Mode>("link");
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [askText, setAskText] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<RecipeFormValues | null>(null);
  const textArea = useRef<HTMLTextAreaElement>(null);

  async function extract(event: React.FormEvent) {
    event.preventDefault();
    setNotice(null);
    setLoading(true);
    try {
      const response = await fetch("/api/extract-recipe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          url: mode === "link" ? url.trim() : undefined,
          text: mode === "text" || askText ? text : undefined,
        }),
      });
      if (!response.ok) {
        const { error } = (await response.json()) as { error: string };
        setNotice(error);
        return;
      }
      const result = (await response.json()) as ExtractResponse;
      if (result.status === "ok") {
        setDraft(toFormValues(result));
      } else {
        setNotice(result.message);
        setAskText(true);
      }
    } catch {
      setNotice("Pas de connexion. Vérifie ton réseau et réessaie.");
    } finally {
      setLoading(false);
    }
  }

  async function paste() {
    try {
      setText(await navigator.clipboard.readText());
    } catch {
      // Permission refusée : le clavier peut encore coller
      textArea.current?.focus();
    }
  }

  if (draft) {
    return (
      <>
        <p className="bg-sage/15 mb-4 rounded-xl p-3 font-semibold">Vérifie la recette, puis enregistre-la dans ton carnet.</p>
        <RecipeForm initial={draft} />
      </>
    );
  }

  const showText = mode === "text" || askText;

  return (
    <>
      <div className="mb-5 grid grid-cols-3 gap-2">
        {MODES.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            aria-pressed={mode === id}
            onClick={() => {
              setMode(id);
              setAskText(false);
              setNotice(null);
            }}
            className={cn("chip justify-center px-2", mode === id && "chip-active")}
          >
            <Icon className="size-5" aria-hidden />
            {label}
          </button>
        ))}
      </div>

      {mode === "manual" ? (
        <RecipeForm initial={emptyRecipe} />
      ) : (
        <form onSubmit={extract} className="flex flex-col gap-4">
          {mode === "link" && (
            <div>
              <label htmlFor="url" className="label">
                Lien YouTube, TikTok, Instagram ou blog
              </label>
              <input
                id="url"
                type="url"
                inputMode="url"
                required
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setAskText(false);
                }}
                placeholder="https://…"
                className="field"
              />
            </div>
          )}

          {notice && (
            <p role="alert" className="text-terracotta-deep font-semibold">
              {notice}
            </p>
          )}

          {showText && (
            <div>
              <label htmlFor="text" className="label">
                Colle la légende ou la liste d’ingrédients de la vidéo
              </label>
              <textarea
                id="text"
                ref={textArea}
                rows={8}
                required
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="field"
              />
              <button type="button" onClick={paste} className="btn-secondary mt-2 w-full">
                <ClipboardPaste className="size-5" aria-hidden />
                Coller depuis le presse-papier
              </button>
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? <Loader2 className="size-6 animate-spin" aria-hidden /> : <Sparkles className="size-6" aria-hidden />}
            {loading ? "Lecture de la recette…" : "Extraire la recette"}
          </button>
          {loading && <p className="text-espresso/75 text-center">Une vidéo peut prendre jusqu’à une minute.</p>}
        </form>
      )}
    </>
  );
}
