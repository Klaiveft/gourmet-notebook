"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/", label: "Pour toi" },
  { href: "/family", label: "Famille" },
];

/** `overlay` : posé sur une photo, le texte passe en blanc. */
export function FeedTabs({ overlay = false }: { overlay?: boolean }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Fils de recettes" className="flex justify-center gap-2">
      {TABS.map(({ href, label }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-12 items-center border-b-2 px-4 text-lg font-bold",
              overlay ? "text-white drop-shadow" : "text-espresso",
              active ? (overlay ? "border-white" : "border-terracotta") : "border-transparent opacity-70",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
