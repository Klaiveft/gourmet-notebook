import Image from "next/image";
import { cn, storageImage } from "@/lib/utils";

const SIZES = { sm: "size-9 text-sm", md: "size-12 text-lg", lg: "size-24 text-4xl" };
const PIXELS = { sm: 36, md: 48, lg: 96 };

type Person = { display_name: string | null; avatar_url: string | null } | null;

export function displayName(person: Person) {
  // Le RLS masque le profil d'une personne qui a quitté la famille
  return person?.display_name || "Ancien membre";
}

export function Avatar({ person, size = "md", src }: { person: Person; size?: keyof typeof SIZES; src?: string | null }) {
  const image = src ?? storageImage(person?.avatar_url);

  return (
    <span
      className={cn(
        "bg-sage relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-serif font-semibold text-white",
        SIZES[size],
      )}
      aria-hidden
    >
      {image ? (
        <Image src={image} alt="" fill sizes={`${PIXELS[size]}px`} unoptimized={!!src} className="object-cover" />
      ) : (
        displayName(person).charAt(0).toUpperCase()
      )}
    </span>
  );
}
