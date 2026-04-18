import { createFileRoute } from "@tanstack/react-router";
import { Search, TrendingUp, Play } from "lucide-react";
import { tracks, artists, getArtist } from "@/lib/mock-data";
import { usePlayer } from "@/components/player/PlayerContext";

export const Route = createFileRoute("/discover")({
  component: DiscoverPage,
  head: () => ({ meta: [{ title: "Discover — Pulse" }] }),
});

const genres = ["Synthwave", "Hip-Hop", "R&B", "Electronic", "Indie", "Afrobeat"];

function DiscoverPage() {
  const { play } = usePlayer();
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
        <div className="space-y-2">
          {tracks.slice(0, 5).map((t, i) => {
            const a = getArtist(t.artistId);
            return (
              <button
                key={t.id}
                onClick={() => play(t)}
                className="flex w-full items-center gap-3 rounded-xl bg-surface/50 p-2 text-left transition hover:bg-surface"
              >
                <span className="w-5 text-center text-sm font-bold text-muted-foreground">{i + 1}</span>
                <img
                  src={t.cover}
                  alt={t.title}
                  width={48}
                  height={48}
                  loading="lazy"
                  className="h-12 w-12 rounded-lg object-cover"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{t.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {a?.name} · {t.plays}
                  </span>
                </span>
                <Play className="h-4 w-4 fill-current text-primary-glow" />
              </button>
            );
          })}
        </div>
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

      <section>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Artists to follow</h2>
        <div className="space-y-2">
          {artists.map((a) => (
            <div key={a.id} className="flex items-center gap-3 rounded-xl bg-surface/50 p-2.5">
              <img
                src={a.avatar}
                alt={a.name}
                width={48}
                height={48}
                loading="lazy"
                className="h-12 w-12 rounded-full object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{a.name}</p>
                <p className="truncate text-xs text-muted-foreground">{a.followers} followers</p>
              </div>
              <button className="rounded-full bg-gradient-primary px-4 py-1.5 text-xs font-bold shadow-glow">
                Follow
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
