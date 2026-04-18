import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Settings, BadgeCheck, Play, Upload, ShieldCheck, LogOut, Music, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { usePlayer } from "@/components/player/PlayerContext";
import { useAuth } from "@/components/auth/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { fetchTracksWithArtists, toPlayable, type TrackWithArtist, publicUrl } from "@/lib/tracks";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
  head: () => ({ meta: [{ title: "Profile — Pulse" }] }),
});

function ProfilePage() {
  const { user, isArtist, isAdmin, signOut, loading: authLoading } = useAuth();
  const { playTrack } = usePlayer();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{ display_name: string | null; avatar_url: string | null; bio: string | null } | null>(null);
  const [myTracks, setMyTracks] = useState<TrackWithArtist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    Promise.all([
      supabase.from("profiles").select("display_name, avatar_url, bio").eq("user_id", user.id).maybeSingle(),
      fetchTracksWithArtists(100),
    ]).then(([{ data }, allTracks]) => {
      setProfile(data ?? null);
      setMyTracks(allTracks.filter((t) => t.user_id === user.id));
      setLoading(false);
    });
  }, [user]);

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
  const avatarUrl = profile?.avatar_url ? publicUrl("track-covers", profile.avatar_url) : null;

  return (
    <div>
      <div className="bg-gradient-hero relative h-40 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-glow" />
        <button className="absolute right-4 top-4 rounded-full glass p-2.5">
          <Settings className="h-5 w-5" />
        </button>
      </div>

      <div className="relative px-4 pb-6">
        <div className="-mt-12 flex h-24 w-24 items-center justify-center rounded-full border-4 border-background bg-gradient-primary text-2xl font-bold shadow-elevated">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="h-full w-full rounded-full object-cover" />
          ) : (
            (profile?.display_name ?? user.email ?? "?").charAt(0).toUpperCase()
          )}
        </div>
        <div className="mt-3 flex items-center gap-1.5">
          <h1 className="text-2xl font-bold">{profile?.display_name ?? user.email}</h1>
          {isArtist && <BadgeCheck className="h-5 w-5 fill-primary text-primary-foreground" />}
        </div>
        <p className="text-sm text-muted-foreground">{user.email}</p>
        {profile?.bio && <p className="mt-2 text-sm">{profile.bio}</p>}

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
              <button
                key={t.id}
                onClick={() => playTrack(toPlayable(t), queue)}
                className="bg-gradient-card group rounded-xl border border-border/50 p-2 text-left"
              >
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
