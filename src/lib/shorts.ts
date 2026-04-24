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

// Réels visibles publiquement pendant 30 jours.
export const SHORTS_PUBLIC_DAYS = 30;

export type FetchShortsOptions = {
  limit?: number;
  /** "feed" = uniquement < 30j (défaut). "all" = pas de filtre date. "archive" = uniquement >= 30j. */
  scope?: "feed" | "all" | "archive";
  /** Restreindre à un auteur précis (utile pour le tableau de bord artiste). */
  userId?: string;
};

export async function fetchShorts(
  limitOrOptions: number | FetchShortsOptions = 30,
): Promise<ShortWithAuthor[]> {
  const opts: FetchShortsOptions =
    typeof limitOrOptions === "number" ? { limit: limitOrOptions } : limitOrOptions;
  const { limit = 30, scope = "feed", userId } = opts;
  const cutoff = new Date(Date.now() - SHORTS_PUBLIC_DAYS * 24 * 60 * 60 * 1000).toISOString();
  let query = supabase.from("shorts").select("*").order("created_at", { ascending: false }).limit(limit);
  if (scope === "feed") query = query.gte("created_at", cutoff);
  else if (scope === "archive") query = query.lt("created_at", cutoff);
  if (userId) query = query.eq("user_id", userId);
  const { data: rows } = await query;
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

export async function downloadShortToDevice(
  short: Pick<ShortWithAuthor, "id" | "videoUrl" | "caption">,
): Promise<void> {
  const filename = `${sanitizeShortFilename(short.caption || `reel-${short.id}`)}.mp4`;
  try {
    const res = await fetch(short.videoUrl);
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
    const a = document.createElement("a");
    a.href = short.videoUrl;
    a.download = filename;
    a.target = "_blank";
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
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
