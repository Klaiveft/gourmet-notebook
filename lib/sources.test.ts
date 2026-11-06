import assert from "node:assert/strict";
import { test } from "node:test";
import { z } from "zod";
import { ExtractedRecipeSchema, RecipeInputSchema, emptyRecipe } from "./schemas.ts";
import { detectPlatform, isPrivateAddress, pageToText, youtubeWatchUrl } from "./sources.ts";

test("reconnaît les plateformes sans se faire piéger par le nom de domaine", () => {
  assert.equal(detectPlatform(new URL("https://www.youtube.com/shorts/abc")), "youtube");
  assert.equal(detectPlatform(new URL("https://youtu.be/abc")), "youtube");
  assert.equal(detectPlatform(new URL("https://vm.tiktok.com/xyz")), "tiktok");
  assert.equal(detectPlatform(new URL("https://www.instagram.com/reel/xyz/")), "instagram");
  assert.equal(detectPlatform(new URL("https://notyoutube.com/x")), "web");
  assert.equal(detectPlatform(new URL("https://youtube.com.evil.fr/x")), "web");
});

test("normalise les URL YouTube pour Gemini", () => {
  const watch = "https://www.youtube.com/watch?v=abc123";
  assert.equal(youtubeWatchUrl(new URL("https://www.youtube.com/shorts/abc123?feature=share")), watch);
  assert.equal(youtubeWatchUrl(new URL("https://youtu.be/abc123?t=4")), watch);
  assert.equal(youtubeWatchUrl(new URL("https://m.youtube.com/watch?v=abc123&list=x")), watch);
  assert.equal(youtubeWatchUrl(new URL("https://www.youtube.com/@chef")), null);
});

test("refuse les adresses internes", () => {
  for (const ip of ["127.0.0.1", "10.1.2.3", "192.168.1.1", "169.254.169.254", "172.16.0.1", "::1", "fd00::1", "::ffff:127.0.0.1"]) {
    assert.equal(isPrivateAddress(ip), true, ip);
  }
  for (const ip of ["8.8.8.8", "172.32.0.1", "2606:4700::1111"]) assert.equal(isPrivateAddress(ip), false, ip);
});

test("extrait métadonnées, JSON-LD et description YouTube", () => {
  const html = `<html><head>
    <meta content="Cookies moelleux" property="og:title">
    <meta name="description" content='Le meilleur cookie'>
    <meta name="viewport" content="width=device-width">
    <script type="application/ld+json">{"@type":"Recipe"}</script>
    <script>var a = {"shortDescription":"2 cups flour\\n1 stick butter"};</script>
    </head><body><nav>Menu</nav><p>Bonjour <b>tout</b> le monde</p></body></html>`;

  const social = pageToText(html, "instagram");
  assert.match(social, /Cookies moelleux/);
  assert.match(social, /Le meilleur cookie/);
  assert.match(social, /"@type":"Recipe"/);
  assert.doesNotMatch(social, /width=device/);
  assert.doesNotMatch(social, /Bonjour/);

  assert.match(pageToText(html, "youtube"), /2 cups flour\n1 stick butter/);

  const blog = pageToText(html, "web");
  assert.match(blog, /Bonjour tout le monde/);
  assert.doesNotMatch(blog, /Menu/);
});

test("le schéma Zod se convertit en JSON Schema pour Gemini", () => {
  const schema = z.toJSONSchema(ExtractedRecipeSchema, { io: "input" }) as { properties: Record<string, unknown> };
  assert.ok(schema.properties.ingredients);
});

test("une recette extraite aux durées décimales reste enregistrable", () => {
  const recipe = RecipeInputSchema.parse({
    ...emptyRecipe,
    title: "Cake",
    prep_time_minutes: 7.5,
    ingredients: [{ name: "Farine", quantity: 62.5, unit: "g", notes: null }],
    steps: [{ instruction: "Mélanger", duration_minutes: 2.4, tip: null }],
  });
  assert.equal(recipe.prep_time_minutes, 8);
  assert.equal(recipe.steps[0].duration_minutes, 2);
  assert.equal(recipe.ingredients[0].quantity, 62.5);
});

test("refuse un lien source javascript:", () => {
  assert.equal(RecipeInputSchema.safeParse({ ...emptyRecipe, title: "x", source_url: "javascript:alert(1)" }).success, false);
});
