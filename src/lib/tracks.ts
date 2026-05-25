import { supabase } from "@/integrations/supabase/client";
import type { PlayableTrack } from "@/components/player/PlayerContext";
import { downloadOfflineMedia, getPreferredMediaUrl, hasOfflineMedia } from "@/lib/offline-media";

export const TRACK_GENRES = [
  "Hip-Hop",
  "R&B",
  "Afrobeat",
  "Gasy / Malagasy",
  "Pop",
  "Electronic",
  "Reggae",
  "Jazz",
  "Rock",
  "Classique",
  "Autre",
] as const;
export type TrackGenre = (typeof TRACK_GENRES)[number];

export type DbTrack = {
  id: string;
  user_id: string;
  title: string;
  audio_path: string;
  cover_path: string | null;
  duration_seconds: number | null;
  plays: number;
  created_at: string;
  genre: string | null;
};


export type TrackWithArtist = DbTrack & {
  artistName: string;
  audioUrl: string;
  coverUrl: string;
};

export type DownloadableTrack = {
  id: string;
  title: string;
  artistName: string;
  audioUrl: string;
  coverUrl?: string;
  audio_path?: string | null;
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

function sanitizeFilename(name: string): string {
  return name.replace(/[\\/:*?"<>|]+/g, "").replace(/\s+/g, " ").trim() || "track";
}

function extFromPathOrUrl(s: string, fallback = "mp3"): string {
  const clean = s.split("?")[0].split("#")[0];
  const m = clean.match(/\.([a-zA-Z0-9]{2,5})$/);
  return m ? m[1].toLowerCase() : fallback;
}

export async function downloadTrack(track: { title: string; audioUrl: string; audio_path?: string | null }): Promise<void> {
  const ext = extFromPathOrUrl(track.audio_path || track.audioUrl, "mp3");
  const filename = `${sanitizeFilename(track.title)}.${ext}`;
  try {
    const res = await fetch(track.audioUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch {
    // Fallback: open in new tab so user can save manually
    const a = document.createElement("a");
    a.href = track.audioUrl;
    a.download = filename;
    a.target = "_blank";
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
}

export async function downloadTrackOffline(
  track: DownloadableTrack,
  onProgress?: (receivedBytes: number, totalBytes: number | null) => void,
) {
  const ext = extFromPathOrUrl(track.audio_path || track.audioUrl, "mp3");
  const filename = `${sanitizeFilename(track.title)}.${ext}`;
  return downloadOfflineMedia({
    id: track.id,
    kind: "audio",
    url: track.audioUrl,
    title: track.title,
    artistName: track.artistName,
    coverUrl: track.coverUrl ?? null,
    fileName: filename,
    onProgress,
  });
}

export function isTrackDownloaded(trackId: string) {
  return hasOfflineMedia("audio", trackId);
}

export function resolveTrackPlaybackUrl(track: Pick<PlayableTrack, "id" | "audioUrl">) {
  return getPreferredMediaUrl("audio", track.id, track.audioUrl);
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
