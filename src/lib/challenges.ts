import { supabase } from "@/integrations/supabase/client";
import { publicUrl } from "@/lib/tracks";

export type Challenge = {
  id: string;
  title: string;
  description: string | null;
  hashtag: string | null;
  coverUrl: string | null;
  createdBy: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  prizeDescription: string | null;
  createdAt: string;
};

export type ChallengeEntry = {
  id: string;
  challengeId: string;
  userId: string;
  trackId: string | null;
  postId: string | null;
  caption: string | null;
  votesCount: number;
  createdAt: string;
  authorName: string;
  authorAvatar: string | null;
  authorIsArtist?: boolean;
  track?: { id: string; title: string; coverUrl: string; artistName: string; audioUrl: string } | null;
};

function toChallenge(row: any): Challenge {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    hashtag: row.hashtag,
    coverUrl: row.cover_path ? publicUrl("track-covers", row.cover_path) : null,
    createdBy: row.created_by,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    isActive: row.is_active,
    prizeDescription: row.prize_description,
    createdAt: row.created_at,
  };
}

export async function fetchActiveChallenges(): Promise<Challenge[]> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("challenges")
    .select("*")
    .eq("is_active", true)
    .lte("starts_at", now)
    .gte("ends_at", now)
    .order("ends_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(toChallenge);
}

export async function fetchAllChallenges(limit = 50): Promise<Challenge[]> {
  const { data, error } = await supabase
    .from("challenges")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map(toChallenge);
}

export async function fetchChallengeById(id: string): Promise<Challenge | null> {
  const { data, error } = await supabase.from("challenges").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? toChallenge(data) : null;
}

export async function fetchChallengeEntries(challengeId: string): Promise<ChallengeEntry[]> {
  const { data, error } = await supabase
    .from("challenge_entries")
    .select("*")
    .eq("challenge_id", challengeId)
    .order("votes_count", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  if (!data?.length) return [];

  const userIds = Array.from(new Set(data.map((e) => e.user_id)));
  const trackIds = Array.from(new Set(data.map((e) => e.track_id).filter((id): id is string => !!id)));

  const [{ data: profiles }, { data: tracks }] = await Promise.all([
    supabase.from("profiles").select("user_id, display_name, avatar_url, is_certified").in("user_id", userIds),
    trackIds.length
      ? supabase.from("tracks").select("id, title, audio_path, cover_path, user_id").in("id", trackIds)
      : { data: [] },
  ]);

  const profileMap = new Map((profiles ?? []).map((p) => [p.user_id, p]));
  const trackRows = tracks ?? [];
  const trackArtistIds = Array.from(new Set(trackRows.map((t) => t.user_id)));
  const { data: trackArtists } = trackArtistIds.length
    ? await supabase.from("profiles").select("user_id, display_name").in("user_id", trackArtistIds)
    : { data: [] };
  const trackArtistMap = new Map((trackArtists ?? []).map((p) => [p.user_id, p.display_name ?? "Unknown"]));

  return data.map((e) => {
    const profile = profileMap.get(e.user_id);
    const track = trackRows.find((t) => t.id === e.track_id);
    return {
      id: e.id,
      challengeId: e.challenge_id,
      userId: e.user_id,
      trackId: e.track_id,
      postId: e.post_id,
      caption: e.caption,
      votesCount: e.votes_count,
      createdAt: e.created_at,
      authorName: profile?.display_name ?? "Utilisateur",
      authorAvatar: profile?.avatar_url ?? null,
      authorIsArtist: !!profile?.is_certified,
      track: track
        ? {
            id: track.id,
            title: track.title,
            coverUrl: publicUrl("track-covers", track.cover_path),
            artistName: trackArtistMap.get(track.user_id) ?? "Unknown",
            audioUrl: publicUrl("audio-tracks", track.audio_path),
          }
        : null,
    };
  });
}

export async function hasUserVoted(entryId: string, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("challenge_votes")
    .select("id")
    .eq("entry_id", entryId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

export async function toggleChallengeVote(entryId: string, userId: string, voted: boolean) {
  if (voted) {
    await supabase.from("challenge_votes").delete().eq("entry_id", entryId).eq("user_id", userId);
  } else {
    await supabase.from("challenge_votes").insert({ entry_id: entryId, user_id: userId });
  }
}

export async function submitChallengeEntry(
  challengeId: string,
  userId: string,
  payload: { trackId?: string | null; postId?: string | null; caption?: string | null },
) {
  const { error } = await supabase.from("challenge_entries").insert({
    challenge_id: challengeId,
    user_id: userId,
    track_id: payload.trackId ?? null,
    post_id: payload.postId ?? null,
    caption: payload.caption?.trim() || null,
  });
  if (error) throw error;
}

export async function deleteChallengeEntry(entryId: string) {
  const { error } = await supabase.from("challenge_entries").delete().eq("id", entryId);
  if (error) throw error;
}

export function formatCount(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export function timeLeftText(endIso: string): string {
  const diff = new Date(endIso).getTime() - Date.now();
  if (diff <= 0) return "Terminé";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days}j ${hours}h restants`;
  if (hours > 0) return `${hours}h restantes`;
  return "Bientôt terminé";
}
