"use client";

import { Camera, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveRecipe } from "@/app/actions";
import { compressImage, uploadImage } from "@/lib/images";
import { CATEGORIES, DIFFICULTIES, type RecipeFormValues } from "@/lib/schemas";

const toNumber = (value: string) => (value === "" ? null : Number(value));

export function RecipeForm({ initial, recipeId }: { initial: RecipeFormValues; recipeId?: string }) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const set = <K extends keyof RecipeFormValues>(key: K, value: RecipeFormValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  const setIngredient = (index: number, patch: Partial<RecipeFormValues["ingredients"][number]>) =>
    set(
      "ingredients",
      values.ingredients.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );

  const setStep = (index: number, patch: Partial<RecipeFormValues["steps"][number]>) =>
    set(
      "steps",
      values.steps.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );

  async function choosePhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);
    setCompressing(true);
    try {
      const compressed = await compressImage(file);
      setPhoto(compressed);
      setPreview(URL.createObjectURL(compressed));
    } catch {
      setError("Cette photo n’a pas pu être préparée. Essaie-en une autre.");
    } finally {
      setCompressing(false);
    }
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        let image_url = values.image_url;
        if (photo) {
          image_url = await uploadImage(photo);
          // Une nouvelle tentative ne doit pas renvoyer la même photo
          set("image_url", image_url);
          setPhoto(null);
        }
        const result = await saveRecipe({ ...values, image_url }, recipeId);
        if ("error" in result) return setError(result.error);
        router.push(`/recipes/${result.id}`);
      } catch {
        setError("Pas de connexion. Ta recette reste ici, réessaie une fois en ligne.");
      }
    });
  }

  const image = preview ?? values.image_url;

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <label className="bg-cream-deep relative flex aspect-[16/9] cursor-pointer flex-col items-center justify-center gap-1 overflow-hidden rounded-2xl font-semibold">
        {image ? (
          <Image src={image} alt="Photo de la recette" fill unoptimized className="object-cover" />
        ) : (
          <>
            <Camera className="text-sage size-8" aria-hidden />
            {compressing ? "Préparation de la photo…" : "Ajouter une photo"}
          </>
        )}
        <input type="file" accept="image/*" onChange={choosePhoto} className="sr-only" />
      </label>

      <div>
        <label htmlFor="title" className="label">
          Titre
        </label>
        <input
          id="title"
          required
          value={values.title}
          onChange={(e) => set("title", e.target.value)}
          className="field"
        />
      </div>

      <div>
        <label htmlFor="description" className="label">
          Description
        </label>
        <textarea
          id="description"
          rows={2}
          value={values.description ?? ""}
          onChange={(e) => set("description", e.target.value || null)}
          className="field"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="category" className="label">
            Catégorie
          </label>
          <select
            id="category"
            value={values.category}
            onChange={(e) => set("category", e.target.value as RecipeFormValues["category"])}
            className="field"
          >
            {CATEGORIES.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="difficulty" className="label">
            Difficulté
          </label>
          <select
            id="difficulty"
            value={values.difficulty}
            onChange={(e) => set("difficulty", e.target.value as RecipeFormValues["difficulty"])}
            className="field"
          >
            {DIFFICULTIES.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label htmlFor="prep" className="label">
            Prépa (min)
          </label>
          <input
            id="prep"
            type="number"
            min={0}
            inputMode="numeric"
            value={values.prep_time_minutes ?? ""}
            onChange={(e) => set("prep_time_minutes", toNumber(e.target.value))}
            className="field"
          />
        </div>
        <div>
          <label htmlFor="cook" className="label">
            Cuisson (min)
          </label>
          <input
            id="cook"
            type="number"
            min={0}
            inputMode="numeric"
            value={values.cook_time_minutes ?? ""}
            onChange={(e) => set("cook_time_minutes", toNumber(e.target.value))}
            className="field"
          />
        </div>
        <div>
          <label htmlFor="servings" className="label">
            Personnes
          </label>
          <input
            id="servings"
            type="number"
            min={1}
            required
            inputMode="numeric"
            value={values.servings}
            onChange={(e) => set("servings", Number(e.target.value))}
            className="field"
          />
        </div>
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 font-serif text-xl font-semibold">Ingrédients</legend>
        {values.ingredients.map((ingredient, index) => (
          <div key={index} className="flex flex-col gap-2 rounded-2xl bg-white p-3">
            <div className="flex gap-2">
              <input
                aria-label={`Nom de l’ingrédient ${index + 1}`}
                placeholder="Farine"
                required
                value={ingredient.name}
                onChange={(e) => setIngredient(index, { name: e.target.value })}
                className="field"
              />
              <button
                type="button"
                aria-label={`Retirer l’ingrédient ${index + 1}`}
                onClick={() =>
                  set(
                    "ingredients",
                    values.ingredients.filter((_, i) => i !== index),
                  )
                }
                className="btn-icon"
              >
                <Trash2 className="size-5" aria-hidden />
              </button>
            </div>
            <div className="grid grid-cols-[5rem_6.5rem_1fr] gap-2">
              <input
                aria-label={`Quantité de l’ingrédient ${index + 1}`}
                type="number"
                min={0}
                step="any"
                inputMode="decimal"
                placeholder="250"
                value={ingredient.quantity ?? ""}
                onChange={(e) => setIngredient(index, { quantity: toNumber(e.target.value) })}
                className="field"
              />
              <input
                aria-label={`Unité de l’ingrédient ${index + 1}`}
                placeholder="g"
                value={ingredient.unit ?? ""}
                onChange={(e) => setIngredient(index, { unit: e.target.value || null })}
                className="field"
              />
              <input
                aria-label={`Précision sur l’ingrédient ${index + 1}`}
                placeholder="tamisée"
                value={ingredient.notes ?? ""}
                onChange={(e) => setIngredient(index, { notes: e.target.value || null })}
                className="field"
              />
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => set("ingredients", [...values.ingredients, { name: "", quantity: null, unit: null, notes: null }])}
          className="btn-secondary"
        >
          <Plus className="size-5" aria-hidden />
          Ajouter un ingrédient
        </button>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 font-serif text-xl font-semibold">Étapes</legend>
        {values.steps.map((step, index) => (
          <div key={index} className="flex flex-col gap-2 rounded-2xl bg-white p-3">
            <div className="flex gap-2">
              <textarea
                aria-label={`Instruction de l’étape ${index + 1}`}
                rows={3}
                required
                value={step.instruction}
                onChange={(e) => setStep(index, { instruction: e.target.value })}
                className="field"
              />
              <button
                type="button"
                aria-label={`Retirer l’étape ${index + 1}`}
                onClick={() =>
                  set(
                    "steps",
                    values.steps.filter((_, i) => i !== index),
                  )
                }
                className="btn-icon"
              >
                <Trash2 className="size-5" aria-hidden />
              </button>
            </div>
            <div className="grid grid-cols-[6rem_1fr] gap-2">
              <input
                aria-label={`Durée de l’étape ${index + 1} en minutes`}
                type="number"
                min={0}
                inputMode="numeric"
                placeholder="min"
                value={step.duration_minutes ?? ""}
                onChange={(e) => setStep(index, { duration_minutes: toNumber(e.target.value) })}
                className="field"
              />
              <input
                aria-label={`Astuce de l’étape ${index + 1}`}
                placeholder="Astuce"
                value={step.tip ?? ""}
                onChange={(e) => setStep(index, { tip: e.target.value || null })}
                className="field"
              />
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => set("steps", [...values.steps, { instruction: "", duration_minutes: null, tip: null }])}
          className="btn-secondary"
        >
          <Plus className="size-5" aria-hidden />
          Ajouter une étape
        </button>
      </fieldset>

      {error && (
        <p role="alert" className="text-terracotta-deep font-semibold">
          {error}
        </p>
      )}
      <button type="submit" disabled={pending || compressing} className="btn-primary">
        {pending ? "Enregistrement…" : "Enregistrer dans mon carnet"}
      </button>
    </form>
  );
}
