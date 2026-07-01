import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, Loader2, Play, ShoppingBag } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { publicUrl, type TrackWithArtist } from "@/lib/tracks";
import { toPlayable } from "@/lib/tracks";
import { usePlayer } from "@/components/player/PlayerContext";
import { ShareMenu } from "@/components/share/ShareMenu";
import { OfflineTrackButton } from "@/components/player/OfflineTrackButton";
import { BuyDialog } from "@/components/purchase/BuyDialog";

export const Route = createFileRoute("/track/$trackId")({
  component: TrackPage,
  head: () => ({ meta: [{ title: "Morceau — Mascartube" }] }),
});

function TrackPage() {
  const { trackId } = useParams({ from: "/track/$trackId" });
  const { playTrack } = usePlayer();
  const [track, setTrack] = useState<TrackWithArtist | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: t } = await supabase.from("tracks").select("*").eq("id", trackId).maybeSingle();
      if (!t) return setLoading(false);
      const { data: prof } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", t.user_id)
        .maybeSingle();
      setTrack({
        ...t,
        artistName: prof?.display_name ?? "Unknown",
        audioUrl: publicUrl("audio-tracks", t.audio_path),
        coverUrl: publicUrl("track-covers", t.cover_path),
      });
      setLoading(false);
    })();
  }, [trackId]);

  if (loading) return <Loader2 className="mx-auto mt-10 h-5 w-5 animate-spin text-muted-foreground" />;
  if (!track)
    return (
      <div className="px-4 pt-10 text-center">
        <p className="text-sm text-muted-foreground">Morceau introuvable.</p>
        <Link to="/" className="mt-3 inline-block text-sm text-primary-glow">Retour</Link>
      </div>
    );

  return (
    <div className="px-4 pt-3 pb-32">
      <Link to="/" className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> Retour
      </Link>
      <div className="bg-gradient-card rounded-2xl border border-border/50 p-4 shadow-soft">
        <img src={track.coverUrl} alt={track.title} className="mb-3 aspect-square w-full rounded-xl object-cover" />
        <h1 className="text-lg font-bold">{track.title}</h1>
        <p className="text-sm text-muted-foreground">{track.artistName}</p>
        <p className="mt-1 text-xs text-muted-foreground">{track.plays} écoutes</p>
        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={() => playTrack(toPlayable(track), [toPlayable(track)])}
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-gradient-primary px-4 py-3 text-sm font-bold shadow-glow"
          >
            <Play className="h-4 w-4 fill-current" /> Écouter
          </button>
          <ShareMenu
            url={`/track/${track.id}`}
            title={track.title}
            text={`${track.title} — ${track.artistName}`}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-border"
          />
          <OfflineTrackButton track={track} />
        </div>
      </div>
    </div>
  );
}
