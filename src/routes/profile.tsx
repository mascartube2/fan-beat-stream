import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Settings, Play, Upload, ShieldCheck, LogOut, Music, Loader2, Film, Search, Library } from "lucide-react";
import { useEffect, useState } from "react";
import { OfflineTrackButton } from "@/components/player/OfflineTrackButton";
import { usePlayer } from "@/components/player/PlayerContext";
import { useAuth } from "@/components/auth/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { uploadProfileAvatar } from "@/lib/avatar";
import { fetchTracksWithArtists, toPlayable, type TrackWithArtist, publicUrl } from "@/lib/tracks";
import { fetchShorts, type ShortWithAuthor } from "@/lib/shorts";
import { CertifiedBadge } from "@/components/brand/CertifiedBadge";
import { toast } from "sonner";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
  head: () => ({ meta: [{ title: "Profile — Mascartube" }] }),
});

function ProfilePage() {
  const { user, isArtist, isAdmin, signOut, loading: authLoading } = useAuth();
  const { playTrack } = usePlayer();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{ display_name: string | null; avatar_url: string | null; bio: string | null; is_certified: boolean } | null>(null);
  const [myTracks, setMyTracks] = useState<TrackWithArtist[]>([]);
  const [myShorts, setMyShorts] = useState<ShortWithAuthor[]>([]);
  const [archivedShorts, setArchivedShorts] = useState<ShortWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const loadProfile = async (userId: string) => {
    const [{ data }, allTracks, recentShorts, oldShorts] = await Promise.all([
      supabase.from("profiles").select("display_name, avatar_url, bio, is_certified").eq("user_id", userId).maybeSingle(),
      fetchTracksWithArtists(100),
      fetchShorts({ scope: "feed", userId, limit: 100 }),
      fetchShorts({ scope: "archive", userId, limit: 100 }),
    ]);
    setProfile(data ?? null);
    setMyTracks(allTracks.filter((t) => t.user_id === userId));
    setMyShorts(recentShorts);
    setArchivedShorts(oldShorts);
    setLoading(false);
  };

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    loadProfile(user.id);

    const onAvatarUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ userId: string; avatarUrl: string }>).detail;
      if (detail?.userId === user.id) {
        setProfile((prev) => (prev ? { ...prev, avatar_url: detail.avatarUrl } : prev));
      }
    };

    window.addEventListener("profile:avatar-updated", onAvatarUpdated);
    return () => window.removeEventListener("profile:avatar-updated", onAvatarUpdated);
  }, [user]);

  const isCertified = !!profile?.is_certified;

  const handleAvatarChange = async (file: File | null) => {
    if (!user || !file) return;
    setUploadingAvatar(true);
    try {
      const avatarUrl = await uploadProfileAvatar(user.id, file);
      setProfile((prev) => (prev ? { ...prev, avatar_url: avatarUrl } : prev));
      toast.success("Photo de profil mise à jour");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Échec de l'upload");
    } finally {
      setUploadingAvatar(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="px-5 pt-12 text-center">
        <p className="mb-4 text-sm text-muted-foreground">Sign in to see your profile.</p>
        <Link to="/auth" className="rounded-full bg-gradient-primary px-5 py-2.5 text-sm font-bold shadow-glow">
          Sign in
        </Link>
      </div>
    );
  }

  const queue = myTracks.map(toPlayable);
  const avatarRaw = profile?.avatar_url ?? null;
  const avatarUrl = avatarRaw
    ? avatarRaw.startsWith("http") ? avatarRaw : publicUrl("avatars", avatarRaw)
    : null;

  return (
    <div className="pb-24">
      <div className="bg-gradient-hero relative h-40 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-glow" />
        <Link to="/profile/edit" className="absolute right-4 top-4 rounded-full glass p-2.5" aria-label="Edit profile">
          <Settings className="h-5 w-5" />
        </Link>
      </div>

      <div className="relative px-4 pb-6">
        <Link to="/profile/edit" className="group relative -mt-12 flex h-24 w-24 items-center justify-center rounded-full border-4 border-background bg-gradient-primary text-2xl font-bold shadow-elevated overflow-hidden">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="h-full w-full rounded-full object-cover" />
          ) : (
            (profile?.display_name ?? user.email ?? "?").charAt(0).toUpperCase()
          )}
        </Link>
        <div className="mt-3 flex items-center gap-1.5">
          <h1 className="text-2xl font-bold">{profile?.display_name ?? user.email}</h1>
          {isCertified && <CertifiedBadge className="h-5 w-5" />}
        </div>
        
        {profile?.bio && <p className="mt-2 text-sm">{profile.bio}</p>}

        <div className="mt-4 flex items-center gap-6 text-sm">
          <div>
            <p className="font-bold">{myTracks.length}</p>
            <p className="text-xs text-muted-foreground">Tracks</p>
          </div>
          <div>
            <p className="font-bold">{myShorts.length}</p>
            <p className="text-xs text-muted-foreground">Réels actifs</p>
          </div>
          <div>
            <p className="font-bold">{archivedShorts.length}</p>
            <p className="text-xs text-muted-foreground">Archivés</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <label className="flex cursor-pointer items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-bold">
            {uploadingAvatar ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            Modifier la photo
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                void handleAvatarChange(e.target.files?.[0] ?? null);
                e.target.value = "";
              }}
            />
          </label>
          {isArtist ? (
            <>
              <Link
                to="/upload"
                className="flex items-center gap-1.5 rounded-full bg-gradient-primary px-4 py-2 text-xs font-bold shadow-glow"
              >
                <Upload className="h-3.5 w-3.5" /> Upload track
              </Link>
              <Link
                to="/artist-dashboard"
                className="flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-bold"
              >
                <Film className="h-3.5 w-3.5" /> Tableau de bord
              </Link>
            </>
          ) : (
            <Link
              to="/become-artist"
              className="flex items-center gap-1.5 rounded-full bg-gradient-primary px-4 py-2 text-xs font-bold shadow-glow"
            >
              <Music className="h-3.5 w-3.5" /> Become artist
            </Link>
          )}
          {isAdmin && (
            <Link
              to="/admin"
              className="flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-bold"
            >
              <ShieldCheck className="h-3.5 w-3.5" /> Admin
            </Link>
          )}
          <button
            onClick={async () => {
              await signOut();
              navigate({ to: "/auth" });
            }}
            className="flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-bold"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>

        <LibrarySection tracks={myTracks} onPlay={(t) => playTrack(toPlayable(t), queue)} />


        {(myShorts.length > 0 || archivedShorts.length > 0) && (
          <>
            <h2 className="mb-3 mt-6 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
              <Film className="h-4 w-4" /> Mes réels
              <span className="ml-auto text-[10px] font-normal">
                {myShorts.length} actifs · {archivedShorts.length} archivés (&gt;30j)
              </span>
            </h2>
            <div className="grid grid-cols-3 gap-2">
              {[...myShorts, ...archivedShorts].slice(0, 12).map((s) => {
                const old = archivedShorts.some((x) => x.id === s.id);
                return (
                  <div key={s.id} className="relative overflow-hidden rounded-lg border border-border/40">
                    <video
                      src={s.videoUrl}
                      poster={s.thumbnailUrl ?? undefined}
                      className={`aspect-[9/16] w-full bg-black object-cover ${old ? "opacity-60" : ""}`}
                      muted
                    />
                    {old && (
                      <span className="absolute left-1 top-1 rounded-full bg-black/70 px-1.5 py-0.5 text-[9px] font-bold uppercase">
                        Archivé
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            {archivedShorts.length > 0 && (
              <p className="mt-2 text-[10px] text-muted-foreground">
                Les réels archivés ne sont plus visibles dans le feed public mais restent dans ton tableau de bord.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function LibrarySection({ tracks, onPlay }: { tracks: TrackWithArtist[]; onPlay: (t: TrackWithArtist) => void }) {
  const [query, setQuery] = useState("");
  const [activeGenre, setActiveGenre] = useState<string>("Tous");

  const totalPlays = tracks.reduce((sum, t) => sum + (t.plays ?? 0), 0);

  const genresPresent = Array.from(
    new Set(tracks.map((t) => t.genre || "Autre")),
  ).sort();
  const genres = ["Tous", ...genresPresent];

  const filtered = tracks.filter((t) => {
    const q = query.trim().toLowerCase();
    const matchQ = !q || t.title.toLowerCase().includes(q);
    const g = t.genre || "Autre";
    const matchG = activeGenre === "Tous" || g === activeGenre;
    return matchQ && matchG;
  });

  const grouped = filtered.reduce<Record<string, TrackWithArtist[]>>((acc, t) => {
    const g = t.genre || "Autre";
    (acc[g] ||= []).push(t);
    return acc;
  }, {});
  const groupKeys = Object.keys(grouped).sort();

  return (
    <section className="mt-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold">
          <Library className="h-4 w-4 text-primary" /> Ma bibliothèque
        </h2>
        <span className="text-[10px] text-muted-foreground">
          {tracks.length} titres · {totalPlays} lectures
        </span>
      </div>

      {tracks.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
          Aucun titre uploadé pour l'instant.
        </p>
      ) : (
        <>
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un titre…"
              className="w-full rounded-full border border-border bg-background/60 py-2 pl-9 pr-3 text-xs outline-none focus:border-primary"
            />
          </div>

          <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1">
            {genres.map((g) => (
              <button
                key={g}
                onClick={() => setActiveGenre(g)}
                className={`shrink-0 rounded-full border px-3 py-1 text-[11px] font-semibold transition ${
                  activeGenre === g
                    ? "border-primary bg-primary text-primary-foreground shadow-glow"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {g} {g !== "Tous" && <span className="opacity-60">({grouped[g]?.length ?? 0})</span>}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground">Aucun résultat.</p>
          ) : (
            <div className="space-y-5">
              {groupKeys.map((g) => (
                <div key={g}>
                  <h3 className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    <span className="h-px flex-1 bg-border/60" />
                    {g}
                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px]">{grouped[g].length}</span>
                    <span className="h-px flex-1 bg-border/60" />
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {grouped[g].map((t) => (
                      <div key={t.id} className="bg-gradient-card group rounded-xl border border-border/50 p-2">
                        <button onClick={() => onPlay(t)} className="w-full text-left">
                          <div className="relative mb-2 overflow-hidden rounded-lg">
                            <img
                              src={t.coverUrl}
                              alt={t.title}
                              width={200}
                              height={200}
                              loading="lazy"
                              className="aspect-square w-full object-cover transition group-hover:scale-105"
                            />
                            <span className="absolute bottom-1.5 right-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-primary opacity-0 shadow-glow transition group-hover:opacity-100">
                              <Play className="ml-0.5 h-3.5 w-3.5 fill-current" />
                            </span>
                          </div>
                          <p className="truncate text-xs font-semibold">{t.title}</p>
                          <p className="truncate text-[10px] text-muted-foreground">{t.plays} lectures</p>
                        </button>
                        <div className="mt-1 flex justify-end">
                          <OfflineTrackButton track={t} compact />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}

