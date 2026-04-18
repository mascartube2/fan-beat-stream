import { createFileRoute } from "@tanstack/react-router";
import { Heart, ListMusic, Clock, Download } from "lucide-react";
import { tracks, getArtist } from "@/lib/mock-data";
import { usePlayer } from "@/components/player/PlayerContext";

export const Route = createFileRoute("/library")({
  component: LibraryPage,
  head: () => ({ meta: [{ title: "Library — Pulse" }] }),
});

const shortcuts = [
  { label: "Liked songs", icon: Heart, count: "42 tracks" },
  { label: "Playlists", icon: ListMusic, count: "8 playlists" },
  { label: "Recent", icon: Clock, count: "Last 7 days" },
  { label: "Downloaded", icon: Download, count: "12 tracks" },
];

function LibraryPage() {
  const { play } = usePlayer();
  return (
    <div className="px-4 pt-4">
      <h1 className="mb-4 text-2xl font-bold">Your Library</h1>

      <div className="mb-6 grid grid-cols-2 gap-2">
        {shortcuts.map(({ label, icon: Icon, count }) => (
          <button
            key={label}
            className="bg-gradient-card flex items-center gap-3 rounded-xl border border-border/50 p-3 text-left"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
              <Icon className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{label}</span>
              <span className="block truncate text-xs text-muted-foreground">{count}</span>
            </span>
          </button>
        ))}
      </div>

      <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Recently played</h2>
      <div className="space-y-2">
        {tracks.map((t) => {
          const a = getArtist(t.artistId);
          return (
            <button
              key={t.id}
              onClick={() => play(t)}
              className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-surface/60"
            >
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
                <span className="block truncate text-xs text-muted-foreground">{a?.name}</span>
              </span>
              <span className="text-xs text-muted-foreground">{t.duration}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
