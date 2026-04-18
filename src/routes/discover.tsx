import { createFileRoute } from "@tanstack/react-router";
import { Search, TrendingUp, Play, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { usePlayer } from "@/components/player/PlayerContext";
import { fetchTracksWithArtists, toPlayable, type TrackWithArtist } from "@/lib/tracks";

export const Route = createFileRoute("/discover")({
  component: DiscoverPage,
  head: () => ({ meta: [{ title: "Discover — Pulse" }] }),
});

const genres = ["Synthwave", "Hip-Hop", "R&B", "Electronic", "Indie", "Afrobeat"];

function DiscoverPage() {
  const { playTrack } = usePlayer();
  const [tracks, setTracks] = useState<TrackWithArtist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTracksWithArtists(10).then((t) => {
      setTracks(t);
      setLoading(false);
    });
  }, []);

  const queue = tracks.map(toPlayable);

  return (
    <div className="px-4 pt-4">
      <h1 className="mb-4 text-2xl font-bold">Discover</h1>

      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          placeholder="Songs, artists, vibes..."
          className="w-full rounded-full border border-border bg-surface py-3 pl-10 pr-4 text-sm outline-none transition focus:border-primary"
        />
      </div>

      <section className="mb-6">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <TrendingUp className="h-4 w-4" /> Trending now
        </h2>
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : tracks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tracks yet — be the first to upload!</p>
        ) : (
          <div className="space-y-2">
            {tracks.slice(0, 5).map((t, i) => (
              <button
                key={t.id}
                onClick={() => playTrack(toPlayable(t), queue)}
                className="flex w-full items-center gap-3 rounded-xl bg-surface/50 p-2 text-left transition hover:bg-surface"
              >
                <span className="w-5 text-center text-sm font-bold text-muted-foreground">{i + 1}</span>
                <img
                  src={t.coverUrl}
                  alt={t.title}
                  width={48}
                  height={48}
                  loading="lazy"
                  className="h-12 w-12 rounded-lg object-cover"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{t.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {t.artistName} · {t.plays} plays
                  </span>
                </span>
                <Play className="h-4 w-4 fill-current text-primary-glow" />
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="mb-6">
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Genres</h2>
        <div className="grid grid-cols-2 gap-2">
          {genres.map((g, i) => (
            <button
              key={g}
              className="relative h-20 overflow-hidden rounded-xl p-3 text-left font-bold shadow-soft"
              style={{
                background: `linear-gradient(135deg, oklch(0.${4 + i} 0.2 ${260 + i * 15}), oklch(0.${3 + i} 0.18 ${280 + i * 10}))`,
              }}
            >
              {g}
            </button>
          ))}
        </div>
      </section>

    </div>
  );
}
