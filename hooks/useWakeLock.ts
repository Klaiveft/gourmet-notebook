import { useEffect, useState } from "react";

/** Garde l'écran allumé tant que le composant est monté. Renvoie false sans erreur si l'API manque. */
export function useWakeLock() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!("wakeLock" in navigator)) return;

    let sentinel: WakeLockSentinel | null = null;
    let unmounted = false;

    async function request() {
      if (document.visibilityState !== "visible" || (sentinel && !sentinel.released)) return;
      try {
        const lock = await navigator.wakeLock.request("screen");
        if (unmounted) return void lock.release();
        sentinel = lock;
        setActive(true);
        lock.addEventListener("release", () => setActive(false));
      } catch {
        // Refus du navigateur (batterie faible, par exemple) : le badge reste simplement absent
      }
    }

    // Le verrou est perdu dès que l'onglet passe en arrière-plan
    document.addEventListener("visibilitychange", request);
    void request();

    return () => {
      unmounted = true;
      document.removeEventListener("visibilitychange", request);
      void sentinel?.release();
    };
  }, []);

  return active;
}
