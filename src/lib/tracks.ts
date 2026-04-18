import { supabase } from "@/integrations/supabase/client";
import type { PlayableTrack } from "@/components/player/PlayerContext";

export type DbTrack = {
  id: string;
  user_id: string;
  title: string;
  audio_path: string;
  cover_path: string | null;
  duration_seconds: number | null;
  plays: number;
  created_at: string;
};

export type TrackWithArtist = DbTrack & {
  artistName: string;
  audioUrl: string;
  coverUrl: string;
};

const FALLBACK_COVER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='%234f46e5'/><stop offset='1' stop-color='%23a78bfa'/></linearGradient></defs><rect width='200' height='200' fill='url(%23g)'/></svg>`,
  );

export function publicUrl(bucket: string, path: string | null): string {
  if (!path) return FALLBACK_COVER;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export async function fetchTracksWithArtists(limit = 50): Promise<TrackWithArtist[]> {
  const { data: tracks, error } = await supabase
    .from("tracks")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !tracks) return [];

  const userIds = [...new Set(tracks.map((t) => t.user_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, display_name")
    .in("user_id", userIds);
  const nameMap = new Map((profiles ?? []).map((p) => [p.user_id, p.display_name ?? "Unknown"]));

  return tracks.map((t) => ({
    ...t,
    artistName: nameMap.get(t.user_id) ?? "Unknown",
    audioUrl: publicUrl("audio-tracks", t.audio_path),
    coverUrl: publicUrl("track-covers", t.cover_path),
  }));
}

export function toPlayable(t: TrackWithArtist): PlayableTrack {
  return {
    id: t.id,
    title: t.title,
    artistName: t.artistName,
    cover: t.coverUrl,
    audioUrl: t.audioUrl,
    duration: t.duration_seconds ?? undefined,
  };
}
