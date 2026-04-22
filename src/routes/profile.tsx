import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Settings, Play, Upload, ShieldCheck, LogOut, Music, Loader2, Coins, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { OfflineTrackButton } from "@/components/player/OfflineTrackButton";
import { usePlayer } from "@/components/player/PlayerContext";
import { useAuth } from "@/components/auth/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { uploadProfileAvatar } from "@/lib/avatar";
import { fetchTracksWithArtists, toPlayable, type TrackWithArtist, publicUrl } from "@/lib/tracks";
import { CertifiedBadge } from "@/components/brand/CertifiedBadge";
import { useMaca, formatAr } from "@/hooks/use-maca";
import { toast } from "sonner";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
  head: () => ({ meta: [{ title: "Profile — Mascartube" }] }),
});

function ProfilePage() {
  const { user, isArtist, isAdmin, signOut, loading: authLoading } = useAuth();
  const { playTrack } = usePlayer();
  const navigate = useNavigate();
  const { balance, isCertified } = useMaca();
  const [profile, setProfile] = useState<{ display_name: string | null; avatar_url: string | null; bio: string | null } | null>(null);
  const [myTracks, setMyTracks] = useState<TrackWithArtist[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const loadProfile = async (userId: string) => {
    const [{ data }, allTracks] = await Promise.all([
      supabase.from("profiles").select("display_name, avatar_url, bio").eq("user_id", userId).maybeSingle(),
      fetchTracksWithArtists(100),
    ]);
    setProfile(data ?? null);
    setMyTracks(allTracks.filter((t) => t.user_id === userId));
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
        <p className="text-sm text-muted-foreground">{user.email}</p>
        {profile?.bio && <p className="mt-2 text-sm">{profile.bio}</p>}

        {/* MA.CA Balance Card */}
        <Link
          to="/wallet"
          className="mt-4 flex items-center justify-between rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/15 to-amber-600/5 p-4 shadow-soft"
        >
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-300/80">Solde</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-xl font-bold text-amber-300">
              <Coins className="h-5 w-5" /> {balance} MA.CA
            </p>
            <p className="text-[10px] text-amber-300/60">≈ {formatAr(balance * 10)}</p>
          </div>
          <span className="flex items-center gap-1 rounded-full bg-amber-400 px-3 py-1.5 text-xs font-bold text-amber-950">
            <Wallet className="h-3.5 w-3.5" /> Portefeuille
          </span>
        </Link>

        <div className="mt-4 flex items-center gap-6 text-sm">
          <div>
            <p className="font-bold">0</p>
            <p className="text-xs text-muted-foreground">Followers</p>
          </div>
          <div>
            <p className="font-bold">0</p>
            <p className="text-xs text-muted-foreground">Following</p>
          </div>
          <div>
            <p className="font-bold">{myTracks.length}</p>
            <p className="text-xs text-muted-foreground">Tracks</p>
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
            <Link
              to="/upload"
              className="flex items-center gap-1.5 rounded-full bg-gradient-primary px-4 py-2 text-xs font-bold shadow-glow"
            >
              <Upload className="h-3.5 w-3.5" /> Upload track
            </Link>
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

        <h2 className="mb-3 mt-6 text-sm font-semibold text-muted-foreground">Your tracks</h2>
        {myTracks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No uploads yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {myTracks.map((t) => (
              <div key={t.id} className="bg-gradient-card group rounded-xl border border-border/50 p-2">
                <button onClick={() => playTrack(toPlayable(t), queue)} className="w-full text-left">
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
                  <p className="truncate text-[10px] text-muted-foreground">{t.plays} plays</p>
                </button>
                <div className="mt-1 flex justify-end">
                  <OfflineTrackButton track={t} compact />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
