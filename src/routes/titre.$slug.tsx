import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, Loader2, Play, ShoppingBag } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { publicUrl, toPlayable, type TrackWithArtist } from "@/lib/tracks";
import { usePlayer } from "@/components/player/PlayerContext";
import { ShareMenu } from "@/components/share/ShareMenu";
import { OfflineTrackButton } from "@/components/player/OfflineTrackButton";
import { BuyDialog } from "@/components/purchase/BuyDialog";

const SITE = "https://fan-beat-stream.lovable.app";

export const Route = createFileRoute("/titre/$slug")({
  component: TrackSlugPage,
  loader: async ({ params }) => {
    const { data: t } = await supabase
      .from("tracks")
      .select("id, title, user_id, cover_path, genre, plays")
      .eq("slug", params.slug)
      .maybeSingle();
    if (!t) throw notFound();
    const { data: prof } = await supabase
      .from("profiles")
      .select("display_name, slug")
      .eq("user_id", t.user_id)
      .maybeSingle();
    return {
      id: t.id,
      title: t.title,
      artistName: prof?.display_name ?? null,
      artistSlug: prof?.slug ?? null,
      coverUrl: t.cover_path ? publicUrl("track-covers", t.cover_path) : null,
      genre: t.genre,
      plays: t.plays ?? 0,
    };
  },
  head: ({ params, loaderData }) => {
    const url = `${SITE}/titre/${params.slug}`;
    if (!loaderData) {
      return {
        meta: [{ title: "Morceau indisponible | Mascartube" }, { name: "robots", content: "noindex" }],
      };
    }
    const artist = loaderData.artistName ?? "artiste malgache";
    const pageTitle = `Écouter ${loaderData.title} — ${artist} | Mascartube`;
    const description = `Écoute « ${loaderData.title} » de ${artist} gratuitement sur Mascartube${
      loaderData.genre ? ` · ${loaderData.genre}` : ""
    }. ${loaderData.plays} écoutes. Streaming et téléchargement à Madagascar.`;
    const cover = loaderData.coverUrl;
    return {
      meta: [
        { title: pageTitle.slice(0, 60) },
        { name: "description", content: description.slice(0, 160) },
        { property: "og:title", content: pageTitle },
        { property: "og:description", content: description.slice(0, 200) },
        { property: "og:type", content: "music.song" },
        { property: "og:url", content: url },
        { name: "twitter:card", content: "summary_large_image" },
        ...(cover
          ? [
              { property: "og:image", content: cover },
              { name: "twitter:image", content: cover },
            ]
          : []),
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "MusicRecording",
            name: loaderData.title,
            byArtist: { "@type": "MusicGroup", name: artist },
            genre: loaderData.genre ?? undefined,
            image: cover ?? undefined,
            url,
          }),
        },
      ],
    };
  },
  notFoundComponent: () => (
    <div className="px-4 pt-10 text-center">
      <p className="text-sm text-muted-foreground">Morceau introuvable.</p>
      <Link to="/" className="mt-3 inline-block text-sm text-primary-glow">
        Retour
      </Link>
    </div>
  ),
});

function TrackSlugPage() {
  const { slug } = Route.useParams();
  const meta = Route.useLoaderData();
  const { playTrack } = usePlayer();
  const [track, setTrack] = useState<(TrackWithArtist & { price_ar?: number; is_for_sale?: boolean }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [buyOpen, setBuyOpen] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: t } = await supabase.from("tracks").select("*").eq("id", meta.id).maybeSingle();
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
  }, [meta.id]);

  if (loading) return <Loader2 className="mx-auto mt-10 h-5 w-5 animate-spin text-muted-foreground" />;
  if (!track)
    return (
      <div className="px-4 pt-10 text-center">
        <p className="text-sm text-muted-foreground">Morceau introuvable.</p>
        <Link to="/" className="mt-3 inline-block text-sm text-primary-glow">
          Retour
        </Link>
      </div>
    );

  return (
    <div className="px-4 pt-3 pb-32">
      <Link to="/" className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> Retour
      </Link>
      <div className="bg-gradient-card rounded-2xl border border-border/50 p-4 shadow-soft">
        <img src={track.coverUrl} alt={`Pochette de ${track.title}`} className="mb-3 aspect-square w-full rounded-xl object-cover" />
        <h1 className="text-lg font-bold">{track.title}</h1>
        {meta.artistSlug ? (
          <Link to="/artiste/$slug" params={{ slug: meta.artistSlug }} className="text-sm text-primary-glow">
            {track.artistName}
          </Link>
        ) : (
          <p className="text-sm text-muted-foreground">{track.artistName}</p>
        )}
        <p className="mt-1 text-xs text-muted-foreground">{track.plays} écoutes</p>
        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={() => playTrack(toPlayable(track), [toPlayable(track)])}
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-gradient-primary px-4 py-3 text-sm font-bold shadow-glow"
          >
            <Play className="h-4 w-4 fill-current" /> Écouter
          </button>
          <ShareMenu
            url={`/titre/${slug}`}
            title={track.title}
            text={`${track.title} — ${track.artistName}`}
            coverUrl={track.coverUrl}
            cardBadge={track.genre ?? "Mascartube"}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-border"
          />
          <OfflineTrackButton track={track} />
        </div>
        {track.is_for_sale && (
          <button
            onClick={() => setBuyOpen(true)}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-primary/50 bg-primary/10 px-4 py-3 text-sm font-bold text-primary-glow transition hover:bg-primary/20"
          >
            <ShoppingBag className="h-4 w-4" />
            Acheter · {(track.price_ar ?? 500).toLocaleString()} Ar
          </button>
        )}
        <Link to="/pricing" className="mt-2 block text-center text-[11px] text-muted-foreground underline">
          Voir la répartition 85 % artiste / 15 % plateforme
        </Link>
      </div>
      {buyOpen && (
        <BuyDialog
          itemType="track"
          itemId={track.id}
          priceAr={track.price_ar ?? 500}
          title={track.title}
          onClose={() => setBuyOpen(false)}
        />
      )}
    </div>
  );
}
