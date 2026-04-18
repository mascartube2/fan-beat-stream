import { Heart, MessageCircle, Share2, Play, Radio, BadgeCheck } from "lucide-react";
import { useState } from "react";
import { getArtist, getTrack, type Post } from "@/lib/mock-data";
import { usePlayer } from "@/components/player/PlayerContext";

function formatCount(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export function PostCard({ post }: { post: Post }) {
  const artist = getArtist(post.artistId);
  const track = post.trackId ? getTrack(post.trackId) : null;
  const { play } = usePlayer();
  const [liked, setLiked] = useState(false);
  const likes = post.likes + (liked ? 1 : 0);

  if (!artist) return null;

  return (
    <article className="bg-gradient-card rounded-2xl border border-border/50 p-4 shadow-soft">
      <header className="mb-3 flex items-center gap-3">
        <img
          src={artist.avatar}
          alt={artist.name}
          width={40}
          height={40}
          loading="lazy"
          className="h-10 w-10 rounded-full object-cover ring-2 ring-primary/40"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <p className="truncate text-sm font-semibold">{artist.name}</p>
            {artist.verified && <BadgeCheck className="h-4 w-4 fill-primary text-primary-foreground" />}
          </div>
          <p className="text-xs text-muted-foreground">
            {artist.handle} · {post.timeAgo}
          </p>
        </div>
        {post.type === "live" && (
          <span className="flex items-center gap-1 rounded-full bg-destructive/20 px-2 py-0.5 text-[10px] font-bold uppercase text-destructive">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-destructive" />
            Live
          </span>
        )}
      </header>

      <p className="mb-3 text-sm leading-relaxed">{post.content}</p>

      {post.cover && (
        <div className="relative mb-3 overflow-hidden rounded-xl">
          <img
            src={post.cover}
            alt=""
            width={512}
            height={512}
            loading="lazy"
            className="aspect-square w-full object-cover"
          />
          {track && (
            <button
              onClick={() => play(track)}
              className="absolute bottom-3 left-3 right-3 flex items-center gap-3 glass rounded-xl p-2.5 transition active:scale-[0.98]"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-primary shadow-glow">
                <Play className="ml-0.5 h-4 w-4 fill-current" />
              </span>
              <span className="min-w-0 flex-1 text-left">
                <span className="block truncate text-sm font-semibold">{track.title}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {track.plays} plays · {track.duration}
                </span>
              </span>
            </button>
          )}
          {post.type === "live" && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/40">
              <button className="flex items-center gap-2 rounded-full bg-gradient-primary px-5 py-3 text-sm font-bold shadow-glow">
                <Radio className="h-4 w-4" /> Join Live
              </button>
            </div>
          )}
        </div>
      )}

      <footer className="flex items-center gap-1 text-muted-foreground">
        <button
          onClick={() => setLiked((l) => !l)}
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition hover:bg-white/5"
        >
          <Heart
            className={`h-5 w-5 transition ${liked ? "scale-110 fill-primary-glow text-primary-glow" : ""}`}
          />
          <span className={liked ? "text-foreground" : ""}>{formatCount(likes)}</span>
        </button>
        <button className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition hover:bg-white/5">
          <MessageCircle className="h-5 w-5" />
          <span>{formatCount(post.comments)}</span>
        </button>
        <button className="ml-auto rounded-full p-2 transition hover:bg-white/5" aria-label="Share">
          <Share2 className="h-5 w-5" />
        </button>
      </footer>
    </article>
  );
}
