import { createFileRoute, notFound } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { publicUrl } from "@/lib/tracks";
import { ArtistWall, resolveAvatar } from "@/components/pages/ArtistWall";

const SITE = "https://fan-beat-stream.lovable.app";

export const Route = createFileRoute("/artiste/$slug")({
  component: ArtistPage,
  loader: async ({ params }) => {
    const { data } = await supabase
      .from("profiles")
      .select("user_id, display_name, bio, avatar_url")
      .eq("slug", params.slug)
      .maybeSingle();
    if (!data) throw notFound();

    const { data: tracks } = await supabase
      .from("tracks")
      .select("title, cover_path")
      .eq("user_id", data.user_id)
      .order("plays", { ascending: false })
      .limit(3);

    const cover = tracks?.find((t) => t.cover_path)?.cover_path ?? null;
    return {
      userId: data.user_id,
      name: data.display_name ?? "Artiste",
      bio: data.bio ?? null,
      avatarUrl: resolveAvatar(data.avatar_url ?? null),
      coverUrl: cover ? publicUrl("track-covers", cover) : null,
      topTracks: (tracks ?? []).map((t) => t.title),
    };
  },
  head: ({ params, loaderData }) => {
    const url = `${SITE}/artiste/${params.slug}`;
    if (!loaderData) {
      return {
        meta: [{ title: "Artiste indisponible | Mascartube" }, { name: "robots", content: "noindex" }],
      };
    }
    const name = loaderData.name;
    const pageTitle = `Écouter ${name} gratuitement sur Mascartube`;
    const tracksLine = loaderData.topTracks.length
      ? ` Titres phares : ${loaderData.topTracks.join(", ")}.`
      : "";
    const description = (
      loaderData.bio
        ? `${loaderData.bio}${tracksLine}`
        : `Découvre la musique, les réels et les publications de ${name} en streaming gratuit sur Mascartube.${tracksLine}`
    ).slice(0, 160);
    const image = loaderData.coverUrl ?? loaderData.avatarUrl;
    return {
      meta: [
        { title: pageTitle.slice(0, 60) },
        { name: "description", content: description },
        { property: "og:title", content: pageTitle },
        { property: "og:description", content: description },
        { property: "og:type", content: "profile" },
        { property: "og:url", content: url },
        { name: "twitter:card", content: "summary_large_image" },
        ...(image
          ? [
              { property: "og:image", content: image },
              { name: "twitter:image", content: image },
            ]
          : []),
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ProfilePage",
            mainEntity: { "@type": "MusicGroup", name, image: image ?? undefined, url },
          }),
        },
      ],
    };
  },
  notFoundComponent: () => (
    <div className="p-6 text-center text-sm text-muted-foreground">Profil introuvable.</div>
  ),
  errorComponent: ({ error }) => (
    <div className="p-6 text-center text-sm text-muted-foreground">{error.message}</div>
  ),
});

function ArtistPage() {
  const { userId } = Route.useLoaderData();
  return <ArtistWall userId={userId} />;
}
