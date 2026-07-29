import { supabase } from "@/integrations/supabase/client";
import { publicUrl } from "@/lib/tracks";

export const PREVIEW_MAX_SECONDS = 80; // 1 min 20
export const PREVIEW_BUCKET = "audio-tracks";

export type AlbumForSale = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  cover_path: string | null;
  price_ar: number;
  is_published: boolean;
  created_at: string;
  preview_path: string | null;
  preview_duration_seconds: number | null;
  artistName: string;
  coverUrl: string;
  previewUrl: string | null;
  trackCount: number;
};

/** Reads the real duration of an audio file in the browser. */
export function readAudioDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(audio.duration) ? audio.duration : 0);
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Fichier audio illisible"));
    };
    audio.src = url;
  });
}

export async function uploadPreview(file: File, ownerId: string): Promise<{ path: string; duration: number }> {
  const duration = await readAudioDuration(file);
  if (duration > PREVIEW_MAX_SECONDS + 0.5) {
    throw new Error(`Extrait trop long (${Math.round(duration)}s). Maximum : 1 min 20.`);
  }
  const ext = file.name.split(".").pop() ?? "mp3";
  const path = `${ownerId}/previews/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from(PREVIEW_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: true });
  if (error) throw error;
  return { path, duration: Math.round(duration) };
}

export async function fetchAlbumsForSale(): Promise<AlbumForSale[]> {
  const { data: albums } = await supabase
    .from("albums")
    .select("*")
    .eq("is_published", true)
    .order("created_at", { ascending: false });
  if (!albums?.length) return [];

  const ids = albums.map((a) => a.id);
  const userIds = [...new Set(albums.map((a) => a.user_id))];
  const [{ data: profiles }, { data: tracks }] = await Promise.all([
    supabase.from("profiles").select("user_id, display_name").in("user_id", userIds),
    supabase.from("tracks").select("id, album_id").in("album_id", ids),
  ]);
  const nameMap = new Map((profiles ?? []).map((p) => [p.user_id, p.display_name ?? "Artiste"]));

  return albums.map((a: any) => ({
    ...a,
    artistName: nameMap.get(a.user_id) ?? "Artiste",
    coverUrl: publicUrl("track-covers", a.cover_path),
    previewUrl: a.preview_path ? publicUrl(PREVIEW_BUCKET, a.preview_path) : null,
    trackCount: (tracks ?? []).filter((t: any) => t.album_id === a.id).length,
  }));
}

export function formatSeconds(s: number | null | undefined) {
  if (!s && s !== 0) return "—";
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}
