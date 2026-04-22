import { supabase } from "@/integrations/supabase/client";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

export function ensureAvatarFile(file: File) {
  if (file.size > MAX_AVATAR_BYTES) {
    throw new Error("Image trop lourde (max 5 Mo)");
  }
}

export async function uploadProfileAvatar(userId: string, file: File) {
  ensureAvatarFile(file);

  const path = `${userId}/avatar`;
  const version = Date.now();
  const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, {
    upsert: true,
    cacheControl: "3600",
    contentType: file.type,
  });

  if (uploadError) throw uploadError;

  const publicUrl = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
  const avatarUrl = `${publicUrl}?v=${version}`;

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl })
    .eq("user_id", userId);

  if (profileError) throw profileError;

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("profile:avatar-updated", { detail: { userId, avatarUrl } }));
  }

  return avatarUrl;
}