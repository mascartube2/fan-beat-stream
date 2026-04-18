import { Pause, Play, SkipBack, SkipForward, Heart } from "lucide-react";
import { usePlayer } from "./PlayerContext";
import { getArtist } from "@/lib/mock-data";
import { useState } from "react";

export function MiniPlayer() {
  const { current, isPlaying, toggle, next, prev } = usePlayer();
  const [liked, setLiked] = useState(false);

  if (!current) return null;
  const artist = getArtist(current.artistId);

  return (
    <div className="fixed bottom-16 left-0 right-0 z-40 px-3 pb-2">
      <div className="glass mx-auto flex max-w-md items-center gap-3 rounded-2xl p-2 shadow-elevated">
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
          <p className="truncate text-xs text-muted-foreground">{artist?.name}</p>
        </div>
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
    </div>
  );
}
