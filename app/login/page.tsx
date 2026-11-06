import { BookHeart } from "lucide-react";
import { LoginForm } from "@/components/LoginForm";
import { safeNextPath } from "@/lib/utils";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error, next } = await searchParams;
  const nextPath = safeNextPath(typeof next === "string" ? next : null);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-8 px-6 py-10">
      <div className="text-center">
        <BookHeart className="text-terracotta mx-auto mb-4 size-14" aria-hidden />
        <h1 className="text-4xl font-semibold">Le Carnet Gourmand</h1>
        <p className="text-espresso/75 mt-2 text-lg">
          {nextPath.startsWith("/join/")
            ? "Ta famille t’invite ! Connecte-toi pour la rejoindre."
            : "Toutes tes recettes, enfin au même endroit."}
        </p>
      </div>
      {error && (
        <p role="alert" className="text-terracotta-deep rounded-xl bg-white p-3 text-center font-semibold">
          Ce lien n’est plus valable. Demandes-en un nouveau.
        </p>
      )}
      <LoginForm next={nextPath} />
    </main>
  );
}
