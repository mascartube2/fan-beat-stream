import { createFileRoute, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { publicUrl } from "@/lib/tracks";

const SITE = "https://fan-beat-stream.lovable.app";

type Row = {
  id: string;
  title: string;
  slug: string | null;
  genre: string | null;
  plays: number;
  coverUrl: string | null;
  artistName: string | null;
  artistSlug: string | null;
  userId: string;
};

export const Route = createFileRoute("/musiques")({
  component: MusiquesPage,
  loader: async (): Promise<Row[]> => {
    const { data: tracks } = await supabase
      .from("tracks")
      .select("id, title, slug, genre, plays, cover_path, user_id")
      .order("created_at", { ascending: false })
      .limit(500);
    const ids = [...new Set((tracks ?? []).map((t) => t.user_id))];
    const { data: profiles } = ids.length
      ? await supabase.from("profiles").select("user_id, display_name, slug").in("user_id", ids)
      : { data: [] as { user_id: string; display_name: string | null; slug: string | null }[] };
    const map = new Map((profiles ?? []).map((p) => [p.user_id, p]));
    return (tracks ?? []).map((t) => ({
      id: t.id,
      title: t.title,
      slug: t.slug,
      genre: t.genre,
      plays: t.plays ?? 0,
      coverUrl: t.cover_path ? publicUrl("track-covers", t.cover_path) : null,
      artistName: map.get(t.user_id)?.display_name ?? null,
      artistSlug: map.get(t.user_id)?.slug ?? null,
      userId: t.user_id,
    }));
  },
  head: ({ loaderData }) => {
    const count = loaderData?.length ?? 0;
    const title = "Toutes les musiques malgaches à écouter | Mascartube";
    const description = `Catalogue complet de ${count || "toutes les"} musiques malgaches à écouter gratuitement en streaming sur Mascartube : nouveautés, artistes et genres.`;
    return {
      meta: [
        { title },
        { name: "description", content: description.slice(0, 160) },
        { property: "og:title", content: title },
        { property: "og:description", content: description.slice(0, 200) },
        { property: "og:type", content: "website" },
        { property: "og:url", content: `${SITE}/musiques` },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: `${SITE}/musiques` }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: "Musiques malgaches sur Mascartube",
            numberOfItems: count,
            itemListElement: (loaderData ?? []).slice(0, 100).map((t, i) => ({
              "@type": "ListItem",
              position: i + 1,
              url: `${SITE}${t.slug ? `/titre/${t.slug}` : `/track/${t.id}`}`,
              name: t.title,
            })),
          }),
        },
      ],
    };
  },
});

function MusiquesPage() {
  const rows = Route.useLoaderData();
  const genres = [...new Set(rows.map((r) => r.genre).filter(Boolean))] as string[];

  return (
    <div className="px-4 pt-4 pb-32">
      <h1 className="text-xl font-bold">Toutes les musiques</h1>
      <p className="mt-1 text-xs text-muted-foreground">
        {rows.length} titres d'artistes malgaches à écouter gratuitement sur Mascartube.
      </p>

      {genres.length > 0 && (
        <p className="mt-3 text-[11px] text-muted-foreground">Genres : {genres.join(" · ")}</p>
      )}

      <ul className="mt-4 divide-y divide-border/50">
        {rows.map((t) => {
          const inner = (
            <>
              {t.coverUrl ? (
                <DataImage
                  src={t.coverUrl}
                  alt={`Pochette de ${t.title}`}
                  width={48}
                  height={48}
                  className="h-12 w-12 shrink-0 rounded-lg object-cover"
                />
              ) : (
                <span className="h-12 w-12 rounded-lg bg-surface" />
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{t.title}</span>
                <span className="block truncate text-[11px] text-muted-foreground">
                  {t.artistName ?? "Artiste"}
                  {t.genre ? ` · ${t.genre}` : ""} · {t.plays} écoutes
                </span>
              </span>
            </>
          );
          return (
            <li key={t.id} className="py-2">
              {t.slug ? (
                <Link to="/titre/$slug" params={{ slug: t.slug }} className="flex items-center gap-3">
                  {inner}
                </Link>
              ) : (
                <Link to="/track/$trackId" params={{ trackId: t.id }} className="flex items-center gap-3">
                  {inner}
                </Link>
              )}
            </li>
          );
        })}
      </ul>


      {rows.length === 0 && (
        <p className="mt-6 text-xs text-muted-foreground">Aucun morceau publié pour le moment.</p>
      )}
    </div>
  );
}
