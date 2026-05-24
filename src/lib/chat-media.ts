import { supabase } from "@/integrations/supabase/client";

export async function uploadChatMedia(userId: string, file: File): Promise<{ url: string; type: "image" | "audio" | "video" | "file" }> {
  const ext = file.name.split(".").pop() || "bin";
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from("chat-media").upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from("chat-media").getPublicUrl(path);
  let type: "image" | "audio" | "video" | "file" = "file";
  if (file.type.startsWith("image/")) type = "image";
  else if (file.type.startsWith("audio/")) type = "audio";
  else if (file.type.startsWith("video/")) type = "video";
  return { url: data.publicUrl, type };
}
