"use client";

import { Check, LogOut, RefreshCw, Share2, Trash2, UserMinus } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import {
  createFamily,
  deleteFamily,
  joinFamily,
  removeFamilyMember,
  renewInviteCode,
  type ActionResult,
} from "@/app/actions";
import { Avatar, displayName } from "@/components/Avatar";
import type { Family } from "@/lib/recipes";
import { inviteCodeFrom } from "@/lib/utils";

const OFFLINE: ActionResult = { error: "Pas de connexion. Réessaie une fois en ligne." };

function useFamilyAction() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<ActionResult>, onSuccess?: () => void) {
    setError(null);
    startTransition(async () => {
      const result = await action().catch(() => OFFLINE);
      if ("error" in result) setError(result.error);
      else onSuccess?.();
    });
  }

  return { error, pending, run };
}

function ErrorMessage({ error }: { error: string | null }) {
  return error ? (
    <p role="alert" className="text-terracotta-deep mt-2 font-semibold">
      {error}
    </p>
  ) : null;
}

function FamilyCard({ family, viewerId }: { family: Family; viewerId: string }) {
  const { error, pending, run } = useFamilyAction();
  const [copied, setCopied] = useState(false);
  const isCreator = family.created_by === viewerId;

  async function invite() {
    const url = `${window.location.origin}/join/${family.invite_code}`;
    const text = `Rejoins « ${family.name} » sur Le Carnet Gourmand !`;
    try {
      if (navigator.share) return await navigator.share({ title: "Le Carnet Gourmand", text, url });
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      // Partage annulé par l'utilisatrice : rien à signaler
    }
  }

  return (
    <li className="rounded-2xl bg-white p-4 shadow-sm">
      <h3 className="text-xl font-semibold">{family.name}</h3>

      <ul className="mt-2">
        {family.family_members.map((member) => {
          const person = member.profiles;
          return (
            <li key={person?.id ?? member.joined_at} className="flex items-center gap-2">
              <Link href={`/profile/${person?.id}`} className="flex min-h-12 flex-1 items-center gap-2.5 font-semibold">
                <Avatar person={person} size="sm" />
                {displayName(person)}
                {person?.id === family.created_by && <span className="text-espresso/70 text-sm font-normal">a créé la famille</span>}
              </Link>
              {isCreator && person && person.id !== viewerId && (
                <button
                  type="button"
                  aria-label={`Retirer ${displayName(person)} de la famille`}
                  disabled={pending}
                  onClick={() => {
                    if (confirm(`Retirer ${displayName(person)} de « ${family.name} » ?`)) {
                      run(() => removeFamilyMember(family.id, person.id));
                    }
                  }}
                  className="btn-icon"
                >
                  <UserMinus className="size-5" aria-hidden />
                </button>
              )}
            </li>
          );
        })}
      </ul>

      <button type="button" onClick={invite} className="btn-primary mt-3 w-full">
        {copied ? <Check className="size-6" aria-hidden /> : <Share2 className="size-6" aria-hidden />}
        {copied ? "Lien copié" : "Inviter un proche"}
      </button>

      <ErrorMessage error={error} />

      <div className="mt-2 flex flex-col gap-2">
        {isCreator ? (
          <>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                if (confirm("Renouveler le lien ? L’ancien lien ne fonctionnera plus.")) {
                  run(() => renewInviteCode(family.id), () => setCopied(false));
                }
              }}
              className="btn-secondary"
            >
              <RefreshCw className="size-5" aria-hidden />
              Renouveler le lien
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                if (confirm(`Supprimer « ${family.name} » ? Chacun garde ses recettes.`)) run(() => deleteFamily(family.id));
              }}
              className="btn-secondary"
            >
              <Trash2 className="size-5" aria-hidden />
              Supprimer la famille
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (confirm(`Quitter « ${family.name} » ?`)) run(() => removeFamilyMember(family.id, viewerId));
            }}
            className="btn-secondary"
          >
            <LogOut className="size-5" aria-hidden />
            Quitter la famille
          </button>
        )}
      </div>
    </li>
  );
}

function FamilySetup() {
  const { error, pending, run } = useFamilyAction();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-white p-4 shadow-sm">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          run(() => createFamily(name), () => setName(""));
        }}
      >
        <label htmlFor="family-name" className="label">
          Créer une famille
        </label>
        <div className="flex gap-2">
          <input
            id="family-name"
            required
            maxLength={60}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Les Martin"
            className="field"
          />
          <button type="submit" disabled={pending} className="btn-secondary shrink-0">
            Créer
          </button>
        </div>
      </form>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          run(() => joinFamily(inviteCodeFrom(code)), () => setCode(""));
        }}
      >
        <label htmlFor="family-code" className="label">
          Rejoindre avec un lien ou un code
        </label>
        <div className="flex gap-2">
          <input id="family-code" required value={code} onChange={(e) => setCode(e.target.value)} className="field" />
          <button type="submit" disabled={pending} className="btn-secondary shrink-0">
            Rejoindre
          </button>
        </div>
      </form>

      <ErrorMessage error={error} />
    </div>
  );
}

export function FamilyPanel({ families, viewerId }: { families: Family[]; viewerId: string }) {
  return (
    <section className="mt-7">
      <h2 className="mb-1 text-xl font-semibold">Ma famille</h2>
      <p className="text-espresso/75 mb-3">Tes recettes partagées sont visibles par tous les membres de tes familles.</p>
      {families.length > 0 && (
        <ul className="mb-3 flex flex-col gap-3">
          {families.map((family) => (
            <FamilyCard key={family.id} family={family} viewerId={viewerId} />
          ))}
        </ul>
      )}
      <FamilySetup />
    </section>
  );
}
