"use client";

import { useEffect } from "react";

export function ServiceWorker() {
  useEffect(() => {
    // En dev, le cache masquerait les modifications
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((error: unknown) => console.warn("Service worker", error));
    }
  }, []);
  return null;
}
