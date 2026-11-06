import imageCompression from "browser-image-compression";
import { createClient } from "@/utils/supabase/client";

const BUCKET = "recipe-images";

export function compressImage(file: File, maxWidthOrHeight = 1600) {
  return imageCompression(file, { maxSizeMB: 0.78, maxWidthOrHeight, fileType: "image/webp", useWebWorker: true });
}

export async function uploadImage(file: File) {
  const supabase = createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) throw new Error("Session expirée");

  const path = `${data.claims.sub}/${crypto.randomUUID()}.webp`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: "image/webp" });
  if (error) throw error;
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}
