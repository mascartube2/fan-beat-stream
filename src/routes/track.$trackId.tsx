import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

/** Ancienne URL — redirige vers /titre/:slug (URL canonique, meilleure pour le SEO). */
export const Route = createFileRoute("/track/$trackId")({
  loader: async ({ params }) => {
    const { data } = await supabase
      .from("tracks")
      .select("slug")
      .eq("id", params.trackId)
      .maybeSingle();
    if (data?.slug) throw redirect({ to: "/titre/$slug", params: { slug: data.slug }, replace: true });
    return {};
  },
  head: () => ({ meta: [{ title: "Morceau | Mascartube" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <div className="px-4 pt-10 text-center">
      <p className="text-sm text-muted-foreground">Morceau introuvable.</p>
      <Link to="/" className="mt-3 inline-block text-sm text-primary-glow">
        Retour
      </Link>
    </div>
  ),
});
