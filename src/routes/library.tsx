import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart, ListMusic, Clock, Download, Upload, Music, Loader2, Play } from "lucide-react";
import { useEffect, useState } from "react";
import { usePlayer } from "@/components/player/PlayerContext";
import { fetchTracksWithArtists, toPlayable, type TrackWithArtist } from "@/lib/tracks";
import { useAuth } from "@/components/auth/AuthContext";

export const Route = createFileRoute("/library")({
  component: LibraryPage,
  head: () => ({ meta: [{ title: "Library — Pulse" }] }),
});

const shortcuts = [
  { label: "Liked songs", icon: Heart, count: "0 tracks" },
  { label: "Playlists", icon: ListMusic, count: "0 playlists" },
  { label: "Recent", icon: Clock, count: "Last 7 days" },
  { label: "Downloaded", icon: Download, count: "0 tracks" },
];

function fmt(s: number | null) {
  if (!s) return "—";
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

function LibraryPage() {
  const { playTrack } = usePlayer();
  const { isArtist } = useAuth();
  const [tracks, setTracks] = useState<TrackWithArtist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTracksWithArtists().then((t) => {
      setTracks(t);
      setLoading(false);
    });
  }, []);

  const playableQueue = tracks.map(toPlayable);

  return (
    <div className="px-4 pt-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Your Library</h1>
        {isArtist && (
          <Link
            to="/upload"
            className="flex items-center gap-1.5 rounded-full bg-gradient-primary px-3 py-1.5 text-xs font-bold shadow-glow"
          >
            <Upload className="h-3.5 w-3.5" /> Upload
          </Link>
        )}
      </div>

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

      <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Latest tracks</h2>

      {loading ? (
        <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
      ) : tracks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 px-4 py-10 text-center">
          <Music className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No tracks uploaded yet.</p>
          {isArtist && (
            <Link
              to="/upload"
              className="mt-3 inline-block rounded-full bg-gradient-primary px-4 py-2 text-xs font-bold shadow-glow"
            >
              Upload the first track
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {tracks.map((t) => (
            <button
              key={t.id}
              onClick={() => playTrack(toPlayable(t), playableQueue)}
              className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-surface/60"
            >
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
                <span className="block truncate text-xs text-muted-foreground">{t.artistName}</span>
              </span>
              <span className="text-xs text-muted-foreground">{fmt(t.duration_seconds)}</span>
              <Play className="h-4 w-4 fill-current text-primary-glow" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
