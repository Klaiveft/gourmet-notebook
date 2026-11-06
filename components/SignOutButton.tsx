"use client";

import { LogOut } from "lucide-react";
import { useTransition } from "react";
import { signOut } from "@/app/actions";
import { clearOfflinePages } from "@/lib/offline";

export function SignOutButton() {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      className="btn-secondary mx-auto mt-10 flex"
      onClick={() =>
        startTransition(async () => {
          await signOut();
          await clearOfflinePages();
          // Rechargement complet : le cache du routeur garde sinon les recettes en mémoire
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination
          window.location.href = "/login";
        })
      }
    >
      <LogOut className="size-5" aria-hidden />
      Se déconnecter
    </button>
  );
}
