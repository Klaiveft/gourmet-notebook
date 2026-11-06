import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [new URL(`${supabaseUrl}/storage/v1/object/public/**`)],
    // Seulement pour `supabase start` : Next refuse sinon les images servies par une IP locale
    dangerouslyAllowLocalIP: new URL(supabaseUrl).hostname === "127.0.0.1",
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
