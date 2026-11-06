import type { EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { safeNextPath } from "@/lib/utils";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const code = searchParams.get("code");
  const supabase = await createClient();

  // token_hash fonctionne même si le mail s'ouvre dans un autre navigateur que celui de la demande (voir README)
  const { error } = tokenHash
    ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type: (searchParams.get("type") ?? "email") as EmailOtpType })
    : await supabase.auth.exchangeCodeForSession(code ?? "");

  // Chemin relatif : request.nextUrl.origin peut différer de l'hôte qui porte les cookies de session
  redirect(error ? "/login?error=lien" : safeNextPath(searchParams.get("next")));
}
