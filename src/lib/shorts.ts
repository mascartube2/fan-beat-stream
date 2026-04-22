import { supabase } from "@/integrations/supabase/client";
import { downloadOfflineMedia, getPreferredMediaUrl, hasOfflineMedia } from "@/lib/offline-media";

export type ShortRow = {
  id: string;
  user_id: string;
  video_path: string;
  thumbnail_path: string | null;
  caption: string | null;
  views_count: number;
  likes_count: number;
  created_at: string;
};

export type ShortWithAuthor = ShortRow & {
  videoUrl: string;
  thumbnailUrl: string | null;
  authorName: string;
  authorAvatar: string | null;
  authorIsArtist: boolean;
  authorIsAdmin: boolean;
  liked: boolean;
};

function sanitizeShortFilename(name: string) {
  return name.replace(/[\\/:*?"<>|]+/g, "").replace(/\s+/g, " ").trim() || "reel";
}

function publicUrl(bucket: string, path: string) {
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

export async function fetchShorts(limit = 30): Promise<ShortWithAuthor[]> {
  const { data: rows } = await supabase
    .from("shorts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (!rows || rows.length === 0) return [];
  const ids = Array.from(new Set(rows.map((r) => r.user_id)));
  const [{ data: profs }, { data: roles }, { data: { user } }] = await Promise.all([
    supabase.from("profiles").select("user_id,display_name,avatar_url,is_certified").in("user_id", ids),
    supabase.from("user_roles").select("user_id,role").in("user_id", ids),
    supabase.auth.getUser(),
  ]);
  let likedSet = new Set<string>();
  if (user) {
    const { data: likes } = await supabase
      .from("short_likes")
      .select("short_id")
      .eq("user_id", user.id)
      .in(
        "short_id",
        rows.map((r) => r.id),
      );
    likedSet = new Set((likes ?? []).map((l) => l.short_id));
  }
  const profMap = new Map((profs ?? []).map((p) => [p.user_id, p]));
  const rolesByUser = new Map<string, Set<string>>();
  (roles ?? []).forEach((r) => {
    if (!rolesByUser.has(r.user_id)) rolesByUser.set(r.user_id, new Set());
    rolesByUser.get(r.user_id)!.add(r.role);
  });
  return rows.map((r) => {
    const userRoles = rolesByUser.get(r.user_id) ?? new Set();
    const prof = profMap.get(r.user_id);
    return {
      ...r,
      videoUrl: publicUrl("shorts", r.video_path),
      thumbnailUrl: r.thumbnail_path ? publicUrl("shorts", r.thumbnail_path) : null,
      authorName: prof?.display_name ?? "User",
      authorAvatar: prof?.avatar_url ?? null,
      authorIsArtist: !!prof?.is_certified || userRoles.has("artist") || userRoles.has("admin"),
      authorIsAdmin: userRoles.has("admin"),
      liked: likedSet.has(r.id),
    };
  });
}

export async function downloadShortOffline(
  short: Pick<ShortWithAuthor, "id" | "videoUrl" | "authorName" | "caption" | "thumbnailUrl">,
  onProgress?: (receivedBytes: number, totalBytes: number | null) => void,
) {
  const filename = `${sanitizeShortFilename(short.caption || `reel-${short.id}`)}.mp4`;
  return downloadOfflineMedia({
    id: short.id,
    kind: "video",
    url: short.videoUrl,
    title: short.caption || "Réel hors ligne",
    artistName: short.authorName,
    coverUrl: short.thumbnailUrl ?? null,
    fileName: filename,
    onProgress,
  });
}

export function isShortDownloaded(shortId: string) {
  return hasOfflineMedia("video", shortId);
}

export function resolveShortPlaybackUrl(short: Pick<ShortWithAuthor, "id" | "videoUrl">) {
  return getPreferredMediaUrl("video", short.id, short.videoUrl);
}
