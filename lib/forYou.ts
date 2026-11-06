import { isInSeason } from "./seasons.ts";

const DAY = 86_400_000;
const FRESHNESS_DAYS = 14;
const SEASON_BOOST = 2;
const REMAKE_AFTER_DAYS = 30;
const REMAKE_MIN_RATING = 4;
const ROW_SIZE = 8;
const FEED_SIZE = 30;

type RecipeSignals = {
  id: string;
  user_id: string;
  title: string;
  category: string;
  is_shared: boolean;
  is_public: boolean;
  shared_at: string | null;
  created_at: string | null;
  forked_from: string | null;
  recipe_ingredients: { name: string }[];
  recipe_likes: { user_id: string }[];
  recipe_comments: { id: string }[];
  recipe_trials: { rating: number | null; trial_date: string }[];
};

const sharedTime = (recipe: RecipeSignals) => new Date(recipe.shared_at ?? recipe.created_at ?? 0).getTime();

/** Ce qui fait parler la famille, en perdant de l'intérêt avec le temps et en favorisant ce qu'on aime cuisiner. */
function score(recipe: RecipeSignals, tastes: Map<string, number>, tasteTotal: number, userId: string, now: Date) {
  const ageInDays = Math.max(0, now.getTime() - sharedTime(recipe)) / DAY;
  const buzz = 1 + recipe.recipe_likes.length + 2 * recipe.recipe_comments.length;
  const taste = tasteTotal ? (tastes.get(recipe.category) ?? 0) / tasteTotal : 0;
  const alreadySeen = recipe.recipe_likes.some((like) => like.user_id === userId) ? 0.5 : 1;
  return buzz * Math.exp(-ageInDays / FRESHNESS_DAYS) * (1 + taste) * alreadySeen;
}

type PublicSignals = {
  id: string;
  title: string;
  category: string;
  published_at: string | null;
  recipe_ingredients: { name: string }[];
  recipe_likes: { user_id: string }[];
  recipe_comments: { id: string }[];
};

/** Un nombre entre 0 et 1, stable pour une même graine : le fil change chaque jour, pas à chaque ouverture. */
function dailyNoise(seed: string) {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) hash = Math.imul(hash ^ seed.charCodeAt(i), 16777619);
  return (hash >>> 0) / 2 ** 32;
}

/** Deux desserts d'affilée lassent vite : chaque recette prend la première catégorie différente de la précédente. */
function spreadCategories<T extends { recipe: { category: string } }>(items: T[]) {
  const rest = [...items];
  const spread: T[] = [];
  while (rest.length > 0) {
    const next = rest.findIndex((item) => item.recipe.category !== spread.at(-1)?.recipe.category);
    spread.push(...rest.splice(Math.max(next, 0), 1));
  }
  return spread;
}

/** Le fil général : ce qui plaît, ce qui est de saison et ce qui ressemble à mes goûts, renouvelé chaque jour. */
export function buildGeneralFeed<T extends PublicSignals>(recipes: T[], myCategories: string[], userId: string, now: Date) {
  const day = now.toISOString().slice(0, 10);

  const ranked = recipes.map((recipe) => {
    const inSeason = isInSeason([recipe.title, ...recipe.recipe_ingredients.map((i) => i.name)], now.getMonth());
    const ageInDays = Math.max(0, now.getTime() - new Date(recipe.published_at ?? 0).getTime()) / DAY;
    const buzz = 1 + recipe.recipe_likes.length + 2 * recipe.recipe_comments.length;
    // Plancher de fraîcheur : le catalogue ne doit pas disparaître au bout de quelques semaines
    const freshness = 0.3 + 0.7 * Math.exp(-ageInDays / FRESHNESS_DAYS);
    const taste = myCategories.length ? myCategories.filter((c) => c === recipe.category).length / myCategories.length : 0;
    const score =
      buzz * freshness * (inSeason ? SEASON_BOOST : 1) * (1 + taste) * (0.4 + dailyNoise(`${day}:${userId}:${recipe.id}`));
    return { recipe, inSeason, score };
  });

  return spreadCategories(ranked.sort((a, b) => b.score - a.score));
}

export function buildForYou<T extends RecipeSignals>(recipes: T[], userId: string, now: Date) {
  const mine = recipes.filter((recipe) => recipe.user_id === userId);
  const family = recipes.filter((recipe) => recipe.user_id !== userId && (recipe.is_shared || recipe.is_public));

  // Une recette déjà copiée dans le carnet n'est plus une découverte
  const copied = new Set(mine.map((recipe) => recipe.forked_from));
  const discoveries = family.filter((recipe) => !copied.has(recipe.id));

  const tastes = new Map<string, number>();
  const liked = family.filter((recipe) => recipe.recipe_likes.some((like) => like.user_id === userId));
  for (const { category } of [...mine, ...liked]) tastes.set(category, (tastes.get(category) ?? 0) + 1);
  const tasteTotal = mine.length + liked.length;

  const hero = [...discoveries].sort(
    (a, b) => score(b, tastes, tasteTotal, userId, now) - score(a, tastes, tasteTotal, userId, now),
  )[0];

  const seasonal = [...mine, ...discoveries]
    .filter((recipe) => recipe.id !== hero?.id)
    .filter((recipe) => isInSeason([recipe.title, ...recipe.recipe_ingredients.map((i) => i.name)], now.getMonth()))
    .slice(0, ROW_SIZE);

  const feed = family
    .filter((recipe) => recipe.id !== hero?.id)
    .sort((a, b) => sharedTime(b) - sharedTime(a))
    .slice(0, FEED_SIZE);

  const lastMade = (recipe: T) => Math.max(...recipe.recipe_trials.map((trial) => new Date(trial.trial_date).getTime()));
  const bestRating = (recipe: T) => Math.max(...recipe.recipe_trials.map((trial) => trial.rating ?? 0));
  const remake = mine
    .filter((recipe) => recipe.recipe_trials.length > 0)
    .filter((recipe) => bestRating(recipe) >= REMAKE_MIN_RATING)
    .filter((recipe) => now.getTime() - lastMade(recipe) > REMAKE_AFTER_DAYS * DAY)
    .sort((a, b) => bestRating(b) - bestRating(a) || lastMade(a) - lastMade(b))
    .slice(0, ROW_SIZE);

  return { hero, seasonal, feed, remake };
}
