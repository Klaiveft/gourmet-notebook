import { Users } from "lucide-react";
import Link from "next/link";
import { JoinFamilyButton } from "@/components/JoinFamilyButton";
import { createClient } from "@/utils/supabase/server";

export default async function JoinPage({ params }: PageProps<"/join/[code]">) {
  const { code } = await params;
  const supabase = await createClient();
  const { data: name } = await supabase.rpc("family_preview", { p_code: code });

  return (
    <div className="mt-10 rounded-2xl bg-white p-6 text-center">
      <Users className="text-sage mx-auto mb-3 size-12" aria-hidden />
      {name ? (
        <>
          <p className="text-espresso/75">On t’invite à rejoindre</p>
          <h1 className="mt-1 mb-2 text-3xl font-semibold">{name}</h1>
          <p className="text-espresso/75 mb-5">Vous verrez les recettes que vous choisissez de vous partager.</p>
          <JoinFamilyButton code={code} />
        </>
      ) : (
        <>
          <h1 className="mb-2 text-2xl font-semibold">Cette invitation n’est plus valable</h1>
          <p className="text-espresso/75 mb-5">Demande un nouveau lien à ta famille.</p>
          <Link href="/" className="btn-primary">
            Retour au carnet
          </Link>
        </>
      )}
    </div>
  );
}
