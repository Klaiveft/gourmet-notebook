"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { joinFamily } from "@/app/actions";

export function JoinFamilyButton({ code }: { code: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function join() {
    setError(null);
    startTransition(async () => {
      const result = await joinFamily(code).catch(() => ({ error: "Pas de connexion. Réessaie une fois en ligne." }));
      if ("error" in result) return setError(result.error);
      router.push("/");
    });
  }

  return (
    <>
      {error && (
        <p role="alert" className="text-terracotta-deep mb-3 font-semibold">
          {error}
        </p>
      )}
      <button type="button" onClick={join} disabled={pending} className="btn-primary w-full">
        {pending ? "Un instant…" : "Rejoindre la famille"}
      </button>
    </>
  );
}
