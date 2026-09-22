import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { publicUrl } from "@/lib/tracks";
import { TrackDetail } from "@/components/pages/TrackDetail";

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
  return (
    <TrackDetail trackId={meta.id} sharePath={`/titre/${slug}`} artistSlug={meta.artistSlug} />
  );
}
