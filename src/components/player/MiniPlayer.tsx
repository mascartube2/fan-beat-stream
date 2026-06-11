import { Pause, Play, SkipBack, SkipForward, Heart } from "lucide-react";
import { usePlayer } from "./PlayerContext";
import { useAuth } from "@/components/auth/AuthContext";
import { useState } from "react";
import { OfflineTrackButton } from "@/components/player/OfflineTrackButton";
import { TrackStatsWidget } from "./TrackStatsWidget";
import { TrackPlayDiagnostics } from "./TrackPlayDiagnostics";

function fmt(s: number) {
  if (!isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export function MiniPlayer() {
  const { current, isPlaying, toggle, next, prev, progress, currentTime, duration, seek } =
    usePlayer();
  const [liked, setLiked] = useState(false);

  if (!current) return null;

  return (
    <div className="fixed bottom-16 left-0 right-0 z-40 px-3 pb-2">
      <div className="glass mx-auto max-w-md rounded-2xl p-2 shadow-elevated">
        <div className="flex items-center gap-3">
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl">
            <img
              src={current.cover}
              alt={current.title}
              width={48}
              height={48}
              className="h-full w-full object-cover"
            />
            {isPlaying && (
              <div className="absolute inset-0 flex items-end justify-center gap-0.5 bg-background/40 pb-1">
                <span className="eq-bar h-3 w-0.5 rounded-full bg-primary-glow" style={{ animationDelay: "0ms" }} />
                <span className="eq-bar h-3 w-0.5 rounded-full bg-primary-glow" style={{ animationDelay: "150ms" }} />
                <span className="eq-bar h-3 w-0.5 rounded-full bg-primary-glow" style={{ animationDelay: "300ms" }} />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{current.title}</p>
            <p className="truncate text-xs text-muted-foreground">{current.artistName}</p>
          </div>
          <OfflineTrackButton track={current} compact />
          <button
            onClick={() => setLiked((l) => !l)}
            className="rounded-full p-2 transition hover:bg-white/10"
            aria-label="Like"
          >
            <Heart className={`h-4 w-4 ${liked ? "fill-primary-glow text-primary-glow" : ""}`} />
          </button>
          <button onClick={prev} className="rounded-full p-1.5 hover:bg-white/10" aria-label="Previous">
            <SkipBack className="h-4 w-4" />
          </button>
          <button
            onClick={toggle}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-primary shadow-glow transition active:scale-95"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause className="h-4 w-4 fill-current" /> : <Play className="ml-0.5 h-4 w-4 fill-current" />}
          </button>
          <button onClick={next} className="rounded-full p-1.5 hover:bg-white/10" aria-label="Next">
            <SkipForward className="h-4 w-4" />
          </button>
        </div>
        <TrackStatsWidget trackId={current.id} initialPlays={current.plays} />
        <TrackPlayDiagnostics />
        <div className="mt-1 flex items-center gap-2 px-1">
          <span className="w-8 text-[10px] tabular-nums text-muted-foreground">{fmt(currentTime)}</span>
          <input
            type="range"
            min={0}
            max={1000}
            value={Math.round(progress * 1000)}
            onChange={(e) => seek(Number(e.target.value) / 1000)}
            className="h-1 flex-1 cursor-pointer accent-primary-glow"
            aria-label="Seek"
          />
          <span className="w-8 text-right text-[10px] tabular-nums text-muted-foreground">{fmt(duration)}</span>
        </div>
      </div>
    </div>
  );
}
