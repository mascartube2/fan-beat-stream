import { createFileRoute, Link } from "@tanstack/react-router";
import { Bell, Search, Play, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { StoriesRow } from "@/components/feed/StoriesRow";
import { PostCard } from "@/components/feed/PostCard";
import { posts } from "@/lib/mock-data";
import { fetchTracksWithArtists, toPlayable, type TrackWithArtist } from "@/lib/tracks";
import { usePlayer } from "@/components/player/PlayerContext";
import { useAuth } from "@/components/auth/AuthContext";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const { playTrack } = usePlayer();
  const { user } = useAuth();
  const [tracks, setTracks] = useState<TrackWithArtist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTracksWithArtists(20).then((t) => {
      setTracks(t);
      setLoading(false);
    });
  }, []);

  const queue = tracks.map(toPlayable);

  return (
    <div className="px-4 pt-4">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">Welcome back</p>
          <h1 className="text-2xl font-bold tracking-tight">
            <span className="text-gradient">Pulse</span>
          </h1>
        </div>
        <div className="flex items-center gap-1">
          <button className="rounded-full p-2.5 hover:bg-white/5" aria-label="Search">
            <Search className="h-5 w-5" />
          </button>
          {user ? (
            <button className="relative rounded-full p-2.5 hover:bg-white/5" aria-label="Notifications">
              <Bell className="h-5 w-5" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary-glow" />
            </button>
          ) : (
            <Link to="/auth" className="rounded-full bg-gradient-primary px-3 py-1.5 text-xs font-bold shadow-glow">
              Sign in
            </Link>
          )}
        </div>
      </header>

      <section className="mb-5">
        <StoriesRow />
      </section>

      {/* Real uploaded tracks */}
      <section className="mb-5">
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Fresh uploads</h2>
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : tracks.length === 0 ? (
          <p className="text-xs text-muted-foreground">No uploads yet — be the first artist!</p>
        ) : (
          <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 scrollbar-hide">
            {tracks.slice(0, 10).map((t) => (
              <button
                key={t.id}
                onClick={() => playTrack(toPlayable(t), queue)}
                className="bg-gradient-card group w-36 shrink-0 snap-start rounded-xl border border-border/50 p-2 text-left"
              >
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
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </section>
    </div>
  );
}
