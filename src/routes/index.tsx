import { createFileRoute, Link } from "@tanstack/react-router";
import { Bell, Search, Play, Loader2, Upload, Music, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { StoriesRow } from "@/components/feed/StoriesRow";
import { UsersPanel } from "@/components/feed/UsersPanel";
import { VisitorCounter } from "@/components/feed/VisitorCounter";
import { OfflineTrackButton } from "@/components/player/OfflineTrackButton";
import { ShareMenu } from "@/components/share/ShareMenu";
import { PostComposer } from "@/components/posts/PostComposer";
import { SocialPostCard, type FeedPost } from "@/components/posts/SocialPostCard";
import { fetchFeedPosts } from "@/lib/posts";
import { fetchTracksWithArtists, toPlayable, type TrackWithArtist } from "@/lib/tracks";
import { usePlayer } from "@/components/player/PlayerContext";
import { useAuth } from "@/components/auth/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import logoSquare from "@/assets/logo-square.png";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const { playTrack } = usePlayer();
  const { user, isArtist, isAdmin } = useAuth();
  const [tracks, setTracks] = useState<TrackWithArtist[]>([]);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);

  const reloadPosts = () => fetchFeedPosts(50).then(setPosts);

  useEffect(() => {
    Promise.all([fetchTracksWithArtists(50), fetchFeedPosts(50)]).then(([t, p]) => {
      setTracks(t);
      setPosts(p);
      setLoading(false);
    });
    const ch = supabase
      .channel("home-posts-rt")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "posts" }, (payload) => {
        const row = payload.new as { id: string; likes_count: number; comments_count: number; reposts_count: number; content: string | null };
        setPosts((prev) => prev.map((x) => (x.id === row.id ? { ...x, likes_count: row.likes_count, comments_count: row.comments_count, reposts_count: row.reposts_count, content: row.content } : x)));
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "posts" }, () => reloadPosts())
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "posts" }, (payload) => {
        const row = payload.old as { id: string };
        setPosts((prev) => prev.filter((x) => x.id !== row.id));
      })
      .subscribe();
    const ch2 = supabase
      .channel("home-tracks-rt")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "tracks" }, (payload) => {
        const row = payload.new as { id: string; plays: number };
        setTracks((prev) => prev.map((x) => (x.id === row.id ? { ...x, plays: row.plays } : x)));
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
      supabase.removeChannel(ch2);
    };
  }, []);

  const queue = tracks.map(toPlayable);

  return (
    <div className="px-4 pt-4">
      <header className="mb-4 flex items-center justify-between">
        <Link to="/" aria-label="Mascartube home" className="flex items-center gap-2">
          <img src={logoSquare} alt="Mascartube" width={48} height={48} className="h-12 w-12 rounded-xl shadow-glow" />
        </Link>
        <div className="flex items-center gap-1">
          <button className="rounded-full p-2.5 hover:bg-white/5" aria-label="Search">
            <Search className="h-5 w-5" />
          </button>
          {user ? (
            <Link to="/notifications" className="relative rounded-full p-2.5 hover:bg-white/5" aria-label="Notifications">
              <Bell className="h-5 w-5" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary-glow" />
            </Link>
          ) : (
            <Link to="/auth" className="rounded-full bg-gradient-primary px-3 py-1.5 text-xs font-bold shadow-glow">
              Sign in
            </Link>
          )}
        </div>
      </header>

      {/* Primary CTA — Add my music */}
      <div className="mb-5 flex flex-wrap gap-2">
        {isArtist ? (
          <Link
            to="/upload"
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-gradient-primary px-4 py-3 text-sm font-bold shadow-glow"
          >
            <Upload className="h-4 w-4" /> Ajouter ma musique
          </Link>
        ) : user ? (
          <Link
            to="/become-artist"
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-gradient-primary px-4 py-3 text-sm font-bold shadow-glow"
          >
            <Music className="h-4 w-4" /> Devenir artiste
          </Link>
        ) : (
          <Link
            to="/auth"
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-gradient-primary px-4 py-3 text-sm font-bold shadow-glow"
          >
            <Music className="h-4 w-4" /> Rejoindre Pulse
          </Link>
        )}
        {isAdmin && (
          <Link
            to="/admin"
            className="flex items-center justify-center gap-1.5 rounded-full border border-border px-4 py-3 text-xs font-bold"
          >
            <ShieldCheck className="h-3.5 w-3.5" /> Admin
          </Link>
        )}
      </div>

      <UsersPanel />

      <section className="mb-5">
        <StoriesRow />
      </section>

      <section className="mb-5">
        <PostComposer onCreated={reloadPosts} />
        {posts.length === 0 && !loading ? (
          <p className="text-xs text-muted-foreground">Pas encore de publication — sois le premier !</p>
        ) : (
          posts.map((p) => <SocialPostCard key={p.id} post={p} onChange={reloadPosts} />)
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground">Nouveautés musique</h2>
          <Link to="/discover" className="text-xs font-semibold text-primary-glow">
            Voir tout
          </Link>
        </div>
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : tracks.length === 0 ? (
          <p className="text-xs text-muted-foreground">Aucun morceau pour le moment — sois le premier artiste !</p>
        ) : (
          <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 scrollbar-hide">
            {tracks.slice(0, 12).map((t) => (
              <div
                key={t.id}
                className="bg-gradient-card group w-36 shrink-0 snap-start rounded-xl border border-border/50 p-2"
              >
                <button onClick={() => playTrack(toPlayable(t), queue)} className="w-full text-left">
                  <div className="relative mb-2 overflow-hidden rounded-lg">
                    <img
                      src={t.coverUrl}
                      alt={t.title}
                      width={144}
                      height={144}
                      loading="lazy"
                      className="aspect-square w-full object-cover"
                    />
                    <span className="absolute bottom-1.5 right-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-primary opacity-0 shadow-glow transition group-hover:opacity-100">
                      <Play className="ml-0.5 h-3.5 w-3.5 fill-current" />
                    </span>
                  </div>
                  <p className="truncate text-xs font-semibold">{t.title}</p>
                  <p className="truncate text-[10px] text-muted-foreground">{t.artistName}</p>
                </button>
                <div className="mt-1 flex items-center justify-end gap-1">
                  <ShareMenu url={`/track/${t.id}`} title={t.title} text={`${t.title} — ${t.artistName}`} />
                  <OfflineTrackButton track={t} compact />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

