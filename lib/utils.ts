import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const quantityFormat = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });

export function formatQuantity(quantity: number | null, unit: string | null) {
  return [quantity === null ? null : quantityFormat.format(quantity), unit].filter(Boolean).join(" ");
}

/** « creme » doit trouver « Crème » : personne ne tape les accents d'une main farinée. */
export function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

/** Refuse tout ce qui sortirait du site : //evil.com, /\evil.com, ou un retour à la ligne que le navigateur retirerait. */
export function safeNextPath(next: string | null | undefined) {
  return next && /^\/(?![/\\])[^\s\\]*$/.test(next) ? next : "/";
}

/**
 * next/image plante sur un hôte non configuré, et ces URL peuvent venir d'un autre compte
 * écrivant directement dans l'API : on ignore tout ce qui n'est pas notre stockage.
 */
export function storageImage(url: string | null | undefined) {
  return url?.startsWith(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/`) ? url : null;
}

/** Accepte le code seul ou le lien d'invitation complet, tel qu'il arrive par message. */
export function inviteCodeFrom(value: string) {
  return value.trim().split("/").filter(Boolean).pop() ?? "";
}

const relativeTime = new Intl.RelativeTimeFormat("fr", { numeric: "auto" });

export function timeAgo(date: string, now: Date) {
  const minutes = Math.round((new Date(date).getTime() - now.getTime()) / 60_000);
  if (minutes > -60) return relativeTime.format(minutes, "minute");
  if (minutes > -60 * 24) return relativeTime.format(Math.round(minutes / 60), "hour");
  return relativeTime.format(Math.round(minutes / (60 * 24)), "day");
}
