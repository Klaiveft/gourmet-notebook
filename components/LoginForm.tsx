"use client";

import { MailCheck } from "lucide-react";
import { useActionState } from "react";
import { sendMagicLink } from "@/app/actions";

export function LoginForm({ next }: { next: string }) {
  const [result, action, pending] = useActionState(sendMagicLink, null);

  if (result && "ok" in result) {
    return (
      <div className="rounded-2xl bg-white p-6 text-center">
        <MailCheck className="text-sage mx-auto mb-3 size-10" aria-hidden />
        <p className="text-lg font-semibold">Regarde ta boîte mail</p>
        <p className="text-espresso/75 mt-1">Clique sur le lien reçu pour ouvrir ton carnet.</p>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      <div>
        <label htmlFor="email" className="label">
          Ton adresse e-mail
        </label>
        <input id="email" name="email" type="email" autoComplete="email" required className="field" />
      </div>
      {result && (
        <p role="alert" className="text-terracotta-deep font-semibold">
          {result.error}
        </p>
      )}
      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Envoi…" : "Recevoir mon lien"}
      </button>
    </form>
  );
}
