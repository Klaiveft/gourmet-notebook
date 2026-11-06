"use client";

import { ChefHat, Heart, Search } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { RecipeCard } from "@/components/RecipeCard";
import { cachePage } from "@/lib/offline";
import type { RecipeListItem } from "@/lib/recipes";
import { CATEGORIES } from "@/lib/schemas";
import { cn, normalize } from "@/lib/utils";

export function RecipeBrowser({ recipes }: { recipes: RecipeListItem[] }) {
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  useEffect(() => {
    void cachePage(pathname);
  }, [pathname, recipes]);

  const visible = useMemo(() => {
    const search = normalize(query.trim());
    return recipes.filter(
      (recipe) =>
        (!category || recipe.category === category) &&
        (!favoritesOnly || recipe.is_favorite) &&
        normalize([recipe.title, ...recipe.recipe_ingredients.map((i) => i.name)].join(" ")).includes(search),
    );
  }, [recipes, query, category, favoritesOnly]);

  if (recipes.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center">
        <ChefHat className="text-sage mx-auto mb-3 size-12" aria-hidden />
        <p className="mb-5 text-lg font-semibold">Ton carnet est encore vide</p>
        <Link href="/add" className="btn-primary">
          Ajouter une recette
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="relative mb-3">
        <Search className="text-espresso/50 absolute top-3.5 left-3 size-5" aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Une recette, un ingrédient…"
          aria-label="Rechercher une recette"
          className="field pl-10"
        />
      </div>

      <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        <button
          type="button"
          aria-pressed={favoritesOnly}
          onClick={() => setFavoritesOnly(!favoritesOnly)}
          className={cn("chip", favoritesOnly && "chip-active")}
        >
          <Heart className="size-4" aria-hidden />
          Favoris
        </button>
        {CATEGORIES.map((name) => (
          <button
            key={name}
            type="button"
            aria-pressed={category === name}
            onClick={() => setCategory(category === name ? null : name)}
            className={cn("chip", category === name && "chip-active")}
          >
            {name}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="text-espresso/75 py-10 text-center">Aucune recette ne correspond.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {visible.map((recipe) => (
            <li key={recipe.id}>
              <RecipeCard recipe={recipe} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
