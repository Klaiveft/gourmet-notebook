import { ChefHat, Clock, Heart } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { storageImage } from "@/lib/utils";

type CardRecipe = {
  id: string;
  title: string;
  category: string;
  image_url: string | null;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  is_favorite?: boolean | null;
};

export function RecipeCard({ recipe }: { recipe: CardRecipe }) {
  const minutes = (recipe.prep_time_minutes ?? 0) + (recipe.cook_time_minutes ?? 0);
  const image = storageImage(recipe.image_url);

  return (
    <Link href={`/recipes/${recipe.id}`} className="block overflow-hidden rounded-2xl bg-white shadow-sm active:scale-[0.98]">
      <div className="bg-cream-deep relative aspect-[4/3]">
        {image ? (
          <Image src={image} alt="" fill sizes="(min-width: 640px) 33vw, 50vw" className="object-cover" />
        ) : (
          <ChefHat className="text-sage-light absolute inset-0 m-auto size-10" aria-hidden />
        )}
        {recipe.is_favorite && (
          <span className="absolute top-2 right-2 rounded-full bg-white/90 p-1">
            <Heart className="fill-terracotta text-terracotta size-4" aria-label="Favori" />
          </span>
        )}
      </div>
      <div className="p-3">
        <h3 className="line-clamp-2 leading-snug font-semibold">{recipe.title}</h3>
        <p className="text-espresso/70 mt-1 flex items-center gap-1 text-sm">
          {minutes > 0 && (
            <>
              <Clock className="size-3.5" aria-hidden />
              {minutes} min ·{" "}
            </>
          )}
          {recipe.category}
        </p>
      </div>
    </Link>
  );
}

/** Une rangée qui défile au pouce, pour que la page reste courte. */
export function RecipeRow({ title, recipes }: { title: string; recipes: CardRecipe[] }) {
  if (recipes.length === 0) return null;

  return (
    <section className="mt-7">
      <h2 className="mb-3 text-xl font-semibold">{title}</h2>
      <ul className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none]">
        {recipes.map((recipe) => (
          <li key={recipe.id} className="w-40 shrink-0">
            <RecipeCard recipe={recipe} />
          </li>
        ))}
      </ul>
    </section>
  );
}
