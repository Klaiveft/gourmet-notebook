// Vérifie le RLS sur le Supabase local (`npx supabase start`), avec des comptes jetables.
// Lancer avec `npm run test:rls`. Les données existantes ne sont ni lues ni modifiées.
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import { createClient } from "@supabase/supabase-js";

const { API_URL, PUBLISHABLE_KEY, SECRET_KEY } = JSON.parse(execSync("npx supabase status --output json", { encoding: "utf8" }));
assert.match(API_URL, /127\.0\.0\.1/, "Ce test ne doit tourner que sur le Supabase local");

const options = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(API_URL, SECRET_KEY, options);
const anon = createClient(API_URL, PUBLISHABLE_KEY, options);

const recipe = {
  title: "Cake",
  description: null,
  category: "Dessert",
  difficulty: "Moyen",
  prep_time_minutes: 10,
  cook_time_minutes: null,
  servings: 6,
  image_url: null,
  source_platform: "manual",
  source_url: null,
};
const ingredients = [
  { name: "Farine", quantity: 62.5, unit: "g", notes: null },
  { name: "Sel", quantity: null, unit: null, notes: null },
];
const steps = [
  { instruction: "Mélanger", duration_minutes: null, tip: "Doucement" },
  { instruction: "Cuire", duration_minutes: 30, tip: null },
];

const users = [];

async function createUser() {
  const email = `rls-${randomUUID()}@example.test`;
  const password = randomUUID();
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  assert.ifError(created.error);
  const client = createClient(API_URL, PUBLISHABLE_KEY, options);
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  assert.ifError(error);
  users.push(data.user.id);
  return { client, id: data.user.id };
}

async function createRecipe(user, overrides = {}) {
  const { data, error } = await user.client.rpc("save_recipe", {
    p_recipe: { ...recipe, ...overrides },
    p_ingredients: ingredients,
    p_steps: steps,
  });
  assert.ifError(error);
  return data;
}

const share = (user, id) => user.client.from("recipes").update({ is_shared: true, shared_at: new Date().toISOString() }).eq("id", id);
const rows = async (query) => (await query).data ?? [];

let alice, bob, carol, familyId, inviteCode;

before(async () => {
  [alice, bob, carol] = [await createUser(), await createUser(), await createUser()];
  const created = await alice.client.rpc("create_family", { p_name: "Les Martin" });
  assert.ifError(created.error);
  familyId = created.data;
  inviteCode = (await alice.client.from("families").select("invite_code").eq("id", familyId).single()).data.invite_code;
  assert.ifError((await bob.client.rpc("join_family", { p_code: inviteCode })).error);
});

after(async () => {
  await admin.from("families").delete().eq("id", familyId);
  for (const id of users) await admin.auth.admin.deleteUser(id);
});

test("un nouveau compte reçoit un profil", async () => {
  const profile = (await alice.client.from("profiles").select("display_name").eq("id", alice.id).single()).data;
  assert.match(profile.display_name, /^rls-/);
});

test("save_recipe crée, remplace les lignes et reste atomique", async () => {
  const id = await createRecipe(alice);
  const select = "title, recipe_ingredients(id), recipe_steps(id)";

  const update = { p_recipe: { ...recipe, title: "Cake 2" }, p_ingredients: ingredients.slice(0, 1), p_steps: steps, p_recipe_id: id };
  assert.ifError((await alice.client.rpc("save_recipe", update)).error);
  assert.equal((await alice.client.from("recipes").select(select).eq("id", id).single()).data.recipe_ingredients.length, 1);

  const broken = { ...update, p_recipe: { ...recipe, title: "Cassé" }, p_ingredients: [{ name: null }] };
  assert.ok((await alice.client.rpc("save_recipe", broken)).error);
  const kept = (await alice.client.from("recipes").select(select).eq("id", id).single()).data;
  assert.equal(kept.title, "Cake 2");
  assert.equal(kept.recipe_steps.length, 2);
});

test("une recette non partagée reste invisible, même dans la famille", async () => {
  const id = await createRecipe(alice);
  for (const user of [bob, carol]) {
    assert.equal((await rows(user.client.from("recipes").select("id").eq("id", id))).length, 0);
    assert.equal((await rows(user.client.from("recipe_ingredients").select("id").eq("recipe_id", id))).length, 0);
    assert.equal((await rows(user.client.from("recipe_steps").select("id").eq("recipe_id", id))).length, 0);
    assert.ok((await user.client.rpc("copy_recipe", { p_recipe_id: id })).error);
    assert.ok((await user.client.from("recipe_likes").insert({ recipe_id: id })).error);
    assert.ok((await user.client.from("recipe_comments").insert({ recipe_id: id, body: "x" })).error);
  }
});

test("une recette partagée est visible de la famille seulement", async () => {
  const id = await createRecipe(alice);
  await share(alice, id);

  assert.equal((await rows(bob.client.from("recipes").select("id").eq("id", id))).length, 1);
  assert.equal((await rows(bob.client.from("recipe_ingredients").select("id").eq("recipe_id", id))).length, 2);
  assert.equal((await rows(bob.client.from("recipe_steps").select("id").eq("recipe_id", id))).length, 2);

  assert.equal((await rows(carol.client.from("recipes").select("id").eq("id", id))).length, 0);
  assert.equal((await rows(carol.client.from("recipe_ingredients").select("id").eq("recipe_id", id))).length, 0);
  assert.equal((await rows(anon.from("recipes").select("id").eq("id", id))).length, 0);
});

test("la famille lit une recette partagée sans pouvoir la modifier", async () => {
  const id = await createRecipe(alice);
  await share(alice, id);

  await bob.client.from("recipes").update({ title: "Piraté", is_shared: false }).eq("id", id);
  await bob.client.from("recipes").delete().eq("id", id);
  await bob.client.from("recipe_ingredients").delete().eq("recipe_id", id);
  assert.ok((await bob.client.from("recipe_ingredients").insert({ recipe_id: id, name: "x" })).error);
  assert.ok((await bob.client.from("recipe_steps").insert({ recipe_id: id, step_number: 9, instruction: "x" })).error);
  assert.ok((await bob.client.rpc("save_recipe", { p_recipe: recipe, p_ingredients: [], p_steps: [], p_recipe_id: id })).error);

  const kept = (await alice.client.from("recipes").select("title, is_shared, recipe_ingredients(id)").eq("id", id).single()).data;
  assert.equal(kept.title, "Cake");
  assert.equal(kept.is_shared, true);
  assert.equal(kept.recipe_ingredients.length, 2);
});

test("les essais restent privés, même sur une recette partagée", async () => {
  const id = await createRecipe(alice);
  await share(alice, id);
  assert.ifError((await alice.client.from("recipe_trials").insert({ recipe_id: id, comment: "Trop salé" })).error);

  assert.equal((await rows(bob.client.from("recipe_trials").select("id").eq("recipe_id", id))).length, 0);
  assert.ok((await bob.client.from("recipe_trials").insert({ recipe_id: id, comment: "x" })).error);
});

test("les profils ne se lisent qu'entre membres d'une famille", async () => {
  assert.equal((await rows(bob.client.from("profiles").select("id").eq("id", alice.id))).length, 1);
  assert.equal((await rows(carol.client.from("profiles").select("id").eq("id", alice.id))).length, 0);
  assert.equal((await rows(anon.from("profiles").select("id"))).length, 0);

  await bob.client.from("profiles").update({ bio: "Piraté" }).eq("id", alice.id);
  assert.equal((await alice.client.from("profiles").select("bio").eq("id", alice.id).single()).data.bio, null);
});

test("une famille et son code ne se lisent qu'en étant membre", async () => {
  assert.equal((await rows(carol.client.from("families").select("id"))).length, 0);
  assert.equal((await rows(carol.client.from("family_members").select("user_id"))).length, 0);
  assert.equal((await rows(anon.from("families").select("id"))).length, 0);

  assert.ok((await carol.client.from("family_members").insert({ family_id: familyId, user_id: carol.id })).error, "Pas d'entrée sans invitation");
  assert.ok((await carol.client.rpc("join_family", { p_code: "mauvais-code" })).error);
  assert.ok((await anon.rpc("join_family", { p_code: inviteCode })).error);
  assert.ok((await anon.rpc("family_preview", { p_code: inviteCode })).error);
  assert.ok((await anon.rpc("create_family", { p_name: "x" })).error);
});

test("seul le créateur renouvelle le code et retire un membre", async () => {
  await bob.client.from("families").update({ invite_code: "piratepirate" }).eq("id", familyId);
  await bob.client.from("families").delete().eq("id", familyId);
  await bob.client.from("family_members").delete().eq("family_id", familyId).eq("user_id", alice.id);
  assert.equal((await rows(alice.client.from("family_members").select("user_id").eq("family_id", familyId))).length, 2);
  assert.equal((await alice.client.from("families").select("invite_code").eq("id", familyId).single()).data.invite_code, inviteCode);
});

test("j'aime et commentaires suivent la visibilité de la recette", async () => {
  const id = await createRecipe(alice);
  await share(alice, id);

  assert.ifError((await bob.client.from("recipe_likes").insert({ recipe_id: id })).error);
  assert.ok((await bob.client.from("recipe_likes").insert({ recipe_id: id })).error, "Un seul j'aime par personne");
  assert.ok((await bob.client.from("recipe_likes").insert({ recipe_id: id, user_id: alice.id })).error, "Pas de j'aime au nom d'un autre");
  assert.ok((await carol.client.from("recipe_likes").insert({ recipe_id: id })).error);

  const comment = await bob.client.from("recipe_comments").insert({ recipe_id: id, body: "Délicieux" }).select("id").single();
  assert.ifError(comment.error);
  assert.ok((await bob.client.from("recipe_comments").insert({ recipe_id: id, body: "x", user_id: alice.id })).error);
  assert.ok((await bob.client.from("recipe_comments").insert({ recipe_id: id, body: "" })).error);
  assert.equal((await rows(carol.client.from("recipe_comments").select("id").eq("recipe_id", id))).length, 0);

  // L'auteur de la recette modère, un tiers non
  const other = await alice.client.from("recipe_comments").insert({ recipe_id: id, body: "Merci" }).select("id").single();
  await bob.client.from("recipe_comments").delete().eq("id", other.data.id);
  assert.equal((await rows(alice.client.from("recipe_comments").select("id").eq("id", other.data.id))).length, 1);
  await alice.client.from("recipe_comments").delete().eq("id", comment.data.id);
  assert.equal((await rows(alice.client.from("recipe_comments").select("id").eq("id", comment.data.id))).length, 0);

  // Ne plus partager coupe l'accès à tout ce qui en dépend
  await alice.client.from("recipes").update({ is_shared: false }).eq("id", id);
  assert.equal((await rows(bob.client.from("recipe_comments").select("id").eq("recipe_id", id))).length, 0);
  assert.equal((await rows(bob.client.from("recipe_likes").select("user_id").eq("recipe_id", id))).length, 0);
});

test("copier une recette crée une recette indépendante, une seule fois", async () => {
  const id = await createRecipe(alice);
  await share(alice, id);

  const copy = await bob.client.rpc("copy_recipe", { p_recipe_id: id });
  assert.ifError(copy.error);
  assert.notEqual(copy.data, id);
  assert.equal((await bob.client.rpc("copy_recipe", { p_recipe_id: id })).data, copy.data);

  const mine = (await bob.client.from("recipes").select("user_id, is_shared, forked_from, recipe_ingredients(id), recipe_steps(id)").eq("id", copy.data).single()).data;
  assert.equal(mine.user_id, bob.id);
  assert.equal(mine.is_shared, false, "Une copie reste privée");
  assert.equal(mine.forked_from, id);
  assert.equal(mine.recipe_ingredients.length, 2);
  assert.equal(mine.recipe_steps.length, 2);

  assert.ok((await alice.client.rpc("copy_recipe", { p_recipe_id: id })).error, "Pas de copie de sa propre recette");
  assert.ok((await carol.client.rpc("copy_recipe", { p_recipe_id: id })).error);

  // La copie survit à l'original
  await alice.client.from("recipes").delete().eq("id", id);
  assert.equal((await bob.client.from("recipes").select("forked_from").eq("id", copy.data).single()).data.forked_from, null);
});

test("quitter la famille coupe l'accès dans les deux sens", async () => {
  const dave = await createUser();
  assert.ifError((await dave.client.rpc("join_family", { p_code: inviteCode })).error);
  const id = await createRecipe(alice);
  await share(alice, id);
  assert.equal((await rows(dave.client.from("recipes").select("id").eq("id", id))).length, 1);

  await dave.client.from("family_members").delete().eq("family_id", familyId).eq("user_id", dave.id);
  assert.equal((await rows(dave.client.from("recipes").select("id").eq("id", id))).length, 0);
  assert.equal((await rows(alice.client.from("profiles").select("id").eq("id", dave.id))).length, 0);
});

test("une recette publique se lit avec un compte, jamais sans", async () => {
  const id = await createRecipe(alice);
  const publish = alice.client.from("recipes").update({ is_public: true, published_at: new Date().toISOString() }).eq("id", id);
  assert.ifError((await publish).error);

  assert.equal((await rows(carol.client.from("recipes").select("id").eq("id", id))).length, 1);
  assert.equal((await rows(carol.client.from("recipe_ingredients").select("id").eq("recipe_id", id))).length, 2);
  assert.equal((await rows(carol.client.from("recipe_steps").select("id").eq("recipe_id", id))).length, 2);
  assert.equal((await rows(anon.from("recipes").select("id").eq("id", id))).length, 0);
  assert.equal((await rows(anon.from("recipe_steps").select("id").eq("recipe_id", id))).length, 0);

  await carol.client.from("recipes").update({ title: "Piraté", is_public: false }).eq("id", id);
  assert.equal((await alice.client.from("recipes").select("title, is_public").eq("id", id).single()).data.is_public, true);

  assert.ifError((await alice.client.from("recipes").update({ is_public: false }).eq("id", id)).error);
  assert.equal((await rows(carol.client.from("recipes").select("id").eq("id", id))).length, 0);
});

test("un compte n'est visible hors famille que s'il s'est exposé", async () => {
  const erin = await createUser();
  const visible = async () => (await rows(erin.client.from("profiles").select("id").eq("id", carol.id))).length;

  assert.equal(await visible(), 0, "Un compte sans publication reste invisible");

  const id = await createRecipe(carol);
  await carol.client.from("recipes").update({ is_public: true }).eq("id", id);
  assert.equal(await visible(), 1, "L'auteur d'une recette publique se voit");
  assert.equal((await rows(anon.from("profiles").select("id").eq("id", carol.id))).length, 0);

  // Commenter expose son nom à ceux qui lisent la recette, et à eux seuls
  assert.ifError((await bob.client.from("recipe_comments").insert({ recipe_id: id, body: "Bravo" })).error);
  assert.equal((await rows(erin.client.from("profiles").select("id").eq("id", bob.id))).length, 1);

  await carol.client.from("recipes").update({ is_public: false }).eq("id", id);
  assert.equal(await visible(), 0);
  assert.equal((await rows(erin.client.from("profiles").select("id").eq("id", bob.id))).length, 0);
});

test("le crédit d'une photo suit la copie et tombe si la photo change", async () => {
  const image_url = "https://example.test/a.webp";
  const id = await createRecipe(alice, { image_url });
  await alice.client.from("recipes").update({ is_public: true, image_credit: "Photo : Jeanne, CC BY 4.0" }).eq("id", id);

  const copy = await carol.client.rpc("copy_recipe", { p_recipe_id: id });
  assert.ifError(copy.error);
  const read = async (user, recipeId) =>
    (await user.client.from("recipes").select("image_credit").eq("id", recipeId).single()).data.image_credit;
  assert.equal(await read(carol, copy.data), "Photo : Jeanne, CC BY 4.0");

  const save = (image) =>
    alice.client.rpc("save_recipe", { p_recipe: { ...recipe, image_url: image }, p_ingredients: ingredients, p_steps: steps, p_recipe_id: id });
  await save(image_url);
  assert.equal(await read(alice, id), "Photo : Jeanne, CC BY 4.0", "Modifier le texte garde le crédit");
  await save("https://example.test/b.webp");
  assert.equal(await read(alice, id), null);
});

test("un lien dangereux est refusé même en appelant l'API directement", async () => {
  assert.ok((await alice.client.from("recipes").insert({ user_id: alice.id, title: "x", source_url: "javascript:alert(1)" })).error);
  assert.ok((await alice.client.from("recipes").insert({ user_id: alice.id, title: "x", image_url: "javascript:alert(1)" })).error);
});

test("le stockage isole les dossiers, et une photo peut être copiée", async () => {
  const bucket = (user) => user.client.storage.from("recipe-images");
  const file = new Blob([new Uint8Array([1, 2, 3])], { type: "image/webp" });
  const path = `${alice.id}/${randomUUID()}.webp`;

  assert.ifError((await bucket(alice).upload(path, file)).error);
  assert.ok((await bucket(bob).upload(`${alice.id}/${randomUUID()}.webp`, file)).error);
  assert.equal((await bucket(bob).remove([path])).data?.length ?? 0, 0);

  const copied = `${bob.id}/${randomUUID()}.webp`;
  assert.ifError((await bucket(bob).copy(path, copied)).error);
  assert.ok((await bucket(bob).copy(path, `${alice.id}/${randomUUID()}.webp`)).error);

  assert.equal((await bucket(alice).remove([path])).data?.length, 1);
  assert.equal((await bucket(bob).remove([copied])).data?.length, 1);
});
