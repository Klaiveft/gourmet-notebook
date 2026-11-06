// Même nom que dans public/sw.js
const PAGES_CACHE = "carnet-pages-v1";

/**
 * La navigation interne de Next ne charge pas de document : sans cet appel, une recette
 * ouverte depuis la liste n'aurait aucune page HTML à servir hors-ligne.
 */
export async function cachePage(path: string) {
  if (!navigator.serviceWorker?.controller) return;
  try {
    const response = await fetch(path);
    if (response.ok && !response.redirected) await (await caches.open(PAGES_CACHE)).put(path, response);
  } catch {
    // Hors-ligne : la copie déjà en cache reste valable
  }
}

export async function forgetPage(path: string) {
  if ("caches" in window) await (await caches.open(PAGES_CACHE)).delete(path);
}

/** Les pages en cache contiennent les recettes : elles ne survivent pas à la déconnexion. */
export async function clearOfflinePages() {
  if ("caches" in window) await caches.delete(PAGES_CACHE);
}
