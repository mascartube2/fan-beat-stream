import { createFileRoute } from "@tanstack/react-router";
import { Search, TrendingUp, Play, Loader2, Music2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { OfflineTrackButton } from "@/components/player/OfflineTrackButton";
import { usePlayer } from "@/components/player/PlayerContext";
import { supabase } from "@/integrations/supabase/client";
import { fetchTracksWithArtists, toPlayable, TRACK_GENRES, type TrackWithArtist } from "@/lib/tracks";

export const Route = createFileRoute("/discover")({
  component: DiscoverPage,
  head: () => ({ meta: [{ title: "Discover — Mascartube" }] }),
});

const ALL = "Tous";

function DiscoverPage() {
  const { playTrack } = usePlayer();
  const [tracks, setTracks] = useState<TrackWithArtist[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState<string>(ALL);

  useEffect(() => {
    fetchTracksWithArtists(200).then((t) => {
      setTracks(t);
      setLoading(false);
    });
    const ch = supabase
      .channel("tracks-plays")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "tracks" }, (payload) => {
        const row = payload.new as { id: string; plays: number };
        setTracks((prev) => prev.map((x) => (x.id === row.id ? { ...x, plays: row.plays } : x)));
      })
      .subscribe();
    const onRecorded = (event: Event) => {
      const detail = (event as CustomEvent<{ trackId: string; playsAfter?: number }>).detail;
      if (!detail?.trackId || typeof detail.playsAfter !== "number") return;
      setTracks((prev) => prev.map((x) => (x.id === detail.trackId ? { ...x, plays: detail.playsAfter! } : x)));
    };
    window.addEventListener("track-play-recorded", onRecorded);
    return () => {
      supabase.removeChannel(ch);
      window.removeEventListener("track-play-recorded", onRecorded);
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tracks.filter((t) => {
      if (selectedGenre !== ALL && (t.genre ?? "Autre") !== selectedGenre) return false;
      if (!q) return true;
      return (
        t.title.toLowerCase().includes(q) ||
        t.artistName.toLowerCase().includes(q) ||
        (t.genre ?? "").toLowerCase().includes(q)
      );
    });
  }, [tracks, query, selectedGenre]);

  const grouped = useMemo(() => {
    const map = new Map<string, TrackWithArtist[]>();
    for (const t of filtered) {
      const key = t.genre ?? "Autre";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    // Order: known genres first, then alphabetical
    const knownOrder = new Map(TRACK_GENRES.map((g, i) => [g, i] as const));
    return [...map.entries()].sort(([a], [b]) => {
      const ia = knownOrder.get(a as never) ?? 999;
      const ib = knownOrder.get(b as never) ?? 999;
      if (ia !== ib) return ia - ib;
      return a.localeCompare(b);
    });
  }, [filtered]);

  const trending = useMemo(() => [...filtered].sort((a, b) => b.plays - a.plays).slice(0, 5), [filtered]);
  const queue = filtered.map(toPlayable);

  const genreChips = [ALL, ...TRACK_GENRES];

  return (
    <div className="px-4 pt-4 pb-24">
      <h1 className="mb-4 text-2xl font-bold">Discover</h1>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Titres, artistes, genres…"
          className="w-full rounded-full border border-border bg-surface py-3 pl-10 pr-4 text-sm outline-none transition focus:border-primary"
        />
      </div>

      <div className="mb-5 -mx-4 overflow-x-auto px-4">
        <div className="flex gap-2">
          {genreChips.map((g) => {
            const active = g === selectedGenre;
            return (
              <button
                key={g}
                onClick={() => setSelectedGenre(g)}
                className={`whitespace-nowrap rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                  active
                    ? "border-primary bg-gradient-primary text-primary-foreground shadow-glow"
                    : "border-border bg-surface/50 text-muted-foreground hover:text-foreground"
                }`}
              >
                {g}
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      ) : tracks.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun morceau encore — sois le premier à publier !</p>
      ) : (
        <>
          {trending.length > 0 && (
            <section className="mb-6">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <TrendingUp className="h-4 w-4" /> Tendances {selectedGenre !== ALL && `· ${selectedGenre}`}
              </h2>
              <div className="space-y-2">
                {trending.map((t, i) => (
                  <div key={t.id} className="flex items-center gap-3 rounded-xl bg-surface/50 p-2 transition hover:bg-surface">
                    <button onClick={() => playTrack(toPlayable(t), queue)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                      <span className="w-5 text-center text-sm font-bold text-muted-foreground">{i + 1}</span>
                      <img src={t.coverUrl} alt={t.title} width={48} height={48} loading="lazy" className="h-12 w-12 rounded-lg object-cover" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{t.title}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {t.artistName} · {t.plays} plays
                        </span>
                      </span>
                      <Play className="h-4 w-4 fill-current text-primary-glow" />
                    </button>
                    <OfflineTrackButton track={t} compact />
                  </div>
                ))}
              </div>
            </section>
          )}

          {grouped.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun morceau pour ce genre.</p>
          ) : (
            grouped.map(([genre, items]) => (
              <section key={genre} className="mb-6">
                <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <Music2 className="h-4 w-4 text-primary-glow" /> {genre}
                  <span className="text-xs font-normal text-muted-foreground">· {items.length}</span>
                </h2>
                <div className="-mx-4 overflow-x-auto px-4">
                  <div className="flex gap-3">
                    {items.map((t) => (
                      <div key={t.id} className="w-36 shrink-0">
                        <button onClick={() => playTrack(toPlayable(t), queue)} className="group block w-full text-left">
                          <div className="relative mb-2 overflow-hidden rounded-xl">
                            <img src={t.coverUrl} alt={t.title} width={144} height={144} loading="lazy" className="aspect-square w-full object-cover transition group-hover:scale-105" />
                            <span className="absolute bottom-1.5 right-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-primary opacity-0 shadow-glow transition group-hover:opacity-100">
                              <Play className="ml-0.5 h-3.5 w-3.5 fill-current" />
                            </span>
                          </div>
                          <p className="truncate text-xs font-semibold">{t.title}</p>
                          <p className="truncate text-[10px] text-muted-foreground">
                            {t.artistName} · {t.plays} lectures
                          </p>
                        </button>
                        <div className="mt-1 flex justify-end">
                          <OfflineTrackButton track={t} compact />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            ))
          )}
        </>
      )}
    </div>
  );
}
