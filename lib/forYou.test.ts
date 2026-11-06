import assert from "node:assert/strict";
import { test } from "node:test";
import { buildForYou, buildGeneralFeed } from "./forYou.ts";
import { isInSeason } from "./seasons.ts";
import { inviteCodeFrom, safeNextPath, storageImage, timeAgo } from "./utils.ts";

const NOW = new Date("2026-11-06T12:00:00Z");
const NOVEMBER = 10;
const JULY = 6;
const daysAgo = (days: number) => new Date(NOW.getTime() - days * 86_400_000).toISOString();

let nextId = 0;
const recipe = (overrides: Partial<Parameters<typeof buildForYou>[0][number]> = {}) => ({
  id: `r${++nextId}`,
  user_id: "other",
  title: "Plat",
  category: "Plat",
  is_shared: true,
  is_public: false,
  published_at: daysAgo(1),
  shared_at: daysAgo(1),
  created_at: daysAgo(1),
  forked_from: null,
  recipe_ingredients: [],
  recipe_likes: [],
  recipe_comments: [],
  recipe_trials: [],
  ...overrides,
});

const likes = (count: number) => Array.from({ length: count }, (_, i) => ({ user_id: `fan${i}` }));

test("la recette du moment est celle dont la famille parle", () => {
  const quiet = recipe();
  const popular = recipe({ recipe_likes: likes(3), recipe_comments: [{ id: "c" }] });
  assert.equal(buildForYou([quiet, popular], "me", NOW).hero?.id, popular.id);
});

test("une vieille recette populaire cède la place à une nouveauté", () => {
  const old = recipe({ shared_at: daysAgo(60), recipe_likes: likes(5) });
  const fresh = recipe({ shared_at: daysAgo(1), recipe_likes: likes(1) });
  assert.equal(buildForYou([old, fresh], "me", NOW).hero?.id, fresh.id);
});

test("à buzz égal, les goûts départagent", () => {
  const mine = recipe({ user_id: "me", is_shared: false, category: "Dessert" });
  const plat = recipe({ category: "Plat" });
  const dessert = recipe({ category: "Dessert" });
  assert.equal(buildForYou([mine, plat, dessert], "me", NOW).hero?.id, dessert.id);
});

test("jamais ses propres recettes ni une recette déjà copiée en vedette", () => {
  const original = recipe({ recipe_likes: likes(9) });
  const copy = recipe({ user_id: "me", is_shared: false, forked_from: original.id });
  const own = recipe({ user_id: "me", recipe_likes: likes(9) });
  assert.equal(buildForYou([original, copy, own], "me", NOW).hero, undefined);
});

test("le fil montre la famille du plus récent au plus ancien, sans doublon ni ses propres recettes", () => {
  const star = recipe({ recipe_likes: likes(9) });
  const older = recipe({ shared_at: daysAgo(5) });
  const newer = recipe({ shared_at: daysAgo(1) });
  const own = recipe({ user_id: "me" });
  const { hero, feed } = buildForYou([older, own, star, newer], "me", NOW);
  assert.equal(hero?.id, star.id);
  assert.deepEqual(feed.map((r) => r.id), [newer.id, older.id]);
});

test("une recette non partagée d'un autre compte n'apparaît nulle part", () => {
  const hidden = recipe({ is_shared: false, title: "Soupe de potimarron" });
  const result = buildForYou([hidden], "me", NOW);
  assert.equal(result.hero, undefined);
  assert.deepEqual([...result.seasonal, ...result.feed, ...result.remake], []);
});

test("les recettes de saison incluent le carnet personnel", () => {
  const mine = recipe({ user_id: "me", is_shared: false, title: "Velouté", recipe_ingredients: [{ name: "Potimarron" }] });
  const summer = recipe({ user_id: "me", is_shared: false, title: "Gaspacho", recipe_ingredients: [{ name: "Tomates" }] });
  assert.deepEqual(buildForYou([mine, summer], "me", NOW).seasonal.map((r) => r.id), [mine.id]);
});

test("à refaire : bien notée, et pas cuisinée depuis un mois", () => {
  const trial = (rating: number, days: number) => ({ rating, trial_date: daysAgo(days).slice(0, 10) });
  const good = recipe({ user_id: "me", recipe_trials: [trial(5, 60)] });
  const recent = recipe({ user_id: "me", recipe_trials: [trial(5, 60), trial(4, 2)] });
  const bad = recipe({ user_id: "me", recipe_trials: [trial(2, 60)] });
  const never = recipe({ user_id: "me" });
  assert.deepEqual(buildForYou([good, recent, bad, never], "me", NOW).remake.map((r) => r.id), [good.id]);
});

test("le fil général garde toutes les recettes et signale celles de saison", () => {
  const recipes = [recipe({ title: "Velouté de potimarron" }), recipe({ title: "Gaspacho", recipe_ingredients: [{ name: "Tomates" }] })];
  const feed = buildGeneralFeed(recipes, [], "me", NOW);
  assert.equal(feed.length, 2);
  assert.equal(feed.find((item) => item.recipe.title === "Velouté de potimarron")?.inSeason, true);
  assert.equal(feed.find((item) => item.recipe.title === "Gaspacho")?.inSeason, false);
});

test("le fil général est stable dans la journée, change le lendemain et diffère selon la personne", () => {
  const recipes = Array.from({ length: 30 }, (_, i) => recipe({ title: `Plat ${i}`, category: i % 2 ? "Plat" : "Dessert" }));
  const order = (user: string, date: Date) => buildGeneralFeed(recipes, [], user, date).map((item) => item.recipe.id).join();
  const tomorrow = new Date(NOW.getTime() + 86_400_000);
  assert.equal(order("me", NOW), order("me", new Date(NOW.getTime() + 3_600_000)));
  assert.notEqual(order("me", NOW), order("me", tomorrow));
  assert.notEqual(order("me", NOW), order("other", NOW));
});

test("le fil général évite deux recettes de la même catégorie à la suite", () => {
  const recipes = Array.from({ length: 20 }, (_, i) => recipe({ category: i < 10 ? "Dessert" : "Plat" }));
  const categories = buildGeneralFeed(recipes, [], "me", NOW).map((item) => item.recipe.category);
  assert.ok(categories.every((category, i) => category !== categories[i - 1]), categories.join());
});

test("le fil général fait remonter ce qui plaît", () => {
  const recipes = Array.from({ length: 10 }, () => recipe());
  const popular = recipe({ recipe_likes: likes(40), recipe_comments: [{ id: "c" }] });
  assert.equal(buildGeneralFeed([...recipes, popular], [], "me", NOW)[0].recipe.id, popular.id);
});

test("une recette seulement publique d'un membre de la famille reste dans le fil familial", () => {
  const published = recipe({ is_shared: false, is_public: true });
  assert.equal(buildForYou([published], "me", NOW).hero?.id, published.id);
});

test("reconnaît la saison sur des mots entiers, accents et pluriels compris", () => {
  assert.equal(isInSeason(["Poireaux vinaigrette"], NOVEMBER), true);
  assert.equal(isInSeason(["Châtaignes grillées"], NOVEMBER), true);
  assert.equal(isInSeason(["Tomate"], NOVEMBER), false);
  assert.equal(isInSeason(["Tomate"], JULY), true);
  assert.equal(isInSeason(["Poireau"], JULY), false, "« poire » ne doit pas trouver « poireau »");
  assert.equal(isInSeason(["Chouquettes"], NOVEMBER), false, "« chou » ne doit pas trouver « chouquettes »");
});

test("une redirection après connexion reste sur le site", () => {
  assert.equal(safeNextPath("/join/abc123"), "/join/abc123");
  for (const bad of ["//evil.com", "/\\evil.com", "https://evil.com", "/\t/evil.com", "", null, undefined]) {
    assert.equal(safeNextPath(bad), "/", String(bad));
  }
});

test("n'accepte que les images de notre stockage", () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://x.supabase.co";
  const ours = "https://x.supabase.co/storage/v1/object/public/recipe-images/a/b.webp";
  assert.equal(storageImage(ours), ours);
  assert.equal(storageImage("https://evil.com/a.png"), null);
  assert.equal(storageImage("https://x.supabase.co.evil.com/storage/v1/object/public/a.png"), null);
  assert.equal(storageImage(null), null);
});

test("lit un code d'invitation seul ou dans un lien", () => {
  assert.equal(inviteCodeFrom(" ab12cd "), "ab12cd");
  assert.equal(inviteCodeFrom("https://carnet.fr/join/ab12cd/"), "ab12cd");
});

test("formule les dates relatives", () => {
  assert.equal(timeAgo(daysAgo(0), NOW), "cette minute-ci");
  assert.equal(timeAgo(new Date(NOW.getTime() - 3 * 3_600_000).toISOString(), NOW), "il y a 3 heures");
  assert.equal(timeAgo(daysAgo(1), NOW), "hier");
  assert.equal(timeAgo(daysAgo(10), NOW), "il y a 10 jours");
});
