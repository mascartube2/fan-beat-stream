import { createFileRoute } from "@tanstack/react-router";
import { Settings, BadgeCheck, Play } from "lucide-react";
import { artists, tracks, getArtist } from "@/lib/mock-data";
import { usePlayer } from "@/components/player/PlayerContext";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
  head: () => ({ meta: [{ title: "Profile — Pulse" }] }),
});

function ProfilePage() {
  // showcase the first artist as "your" public profile preview
  const me = artists[0];
  const myTracks = tracks.filter((t) => t.artistId === me.id);
  const { play } = usePlayer();

  return (
    <div>
      <div className="bg-gradient-hero relative h-40 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-glow" />
        <button className="absolute right-4 top-4 rounded-full glass p-2.5">
          <Settings className="h-5 w-5" />
        </button>
      </div>

      <div className="relative px-4 pb-6">
        <img
          src={me.avatar}
          alt={me.name}
          width={96}
          height={96}
          className="-mt-12 h-24 w-24 rounded-full border-4 border-background object-cover shadow-elevated"
        />
        <div className="mt-3 flex items-center gap-1.5">
          <h1 className="text-2xl font-bold">{me.name}</h1>
          {me.verified && <BadgeCheck className="h-5 w-5 fill-primary text-primary-foreground" />}
        </div>
        <p className="text-sm text-muted-foreground">{me.handle}</p>
        <p className="mt-2 text-sm">{me.bio}</p>

        <div className="mt-4 flex items-center gap-6 text-sm">
          <div>
            <p className="font-bold">{me.followers}</p>
            <p className="text-xs text-muted-foreground">Followers</p>
          </div>
          <div>
            <p className="font-bold">142</p>
            <p className="text-xs text-muted-foreground">Following</p>
          </div>
          <div>
            <p className="font-bold">{myTracks.length}</p>
            <p className="text-xs text-muted-foreground">Tracks</p>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button className="flex-1 rounded-full bg-gradient-primary py-2.5 text-sm font-bold shadow-glow">
            Edit profile
          </button>
          <button className="rounded-full border border-border px-5 py-2.5 text-sm font-bold">Share</button>
        </div>

        <h2 className="mb-3 mt-6 text-sm font-semibold text-muted-foreground">Your tracks</h2>
        <div className="grid grid-cols-2 gap-3">
          {tracks.slice(0, 4).map((t) => {
            const a = getArtist(t.artistId);
            return (
              <button
                key={t.id}
                onClick={() => play(t)}
                className="bg-gradient-card group rounded-xl border border-border/50 p-2 text-left"
              >
                <div className="relative mb-2 overflow-hidden rounded-lg">
                  <img
                    src={t.cover}
                    alt={t.title}
                    width={200}
                    height={200}
                    loading="lazy"
                    className="aspect-square w-full object-cover transition group-hover:scale-105"
                  />
                  <span className="absolute bottom-1.5 right-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-primary opacity-0 shadow-glow transition group-hover:opacity-100">
                    <Play className="ml-0.5 h-3.5 w-3.5 fill-current" />
                  </span>
                </div>
                <p className="truncate text-xs font-semibold">{t.title}</p>
                <p className="truncate text-[10px] text-muted-foreground">{a?.name} · {t.plays}</p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
