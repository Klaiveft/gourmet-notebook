import type { NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

export function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|icons/|manifest.json|sw.js|offline.html).*)"],
};
