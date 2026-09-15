import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

/** Ancienne URL — redirige vers /artiste/:slug (URL canonique, meilleure pour le SEO). */
export const Route = createFileRoute("/u/$userId")({
  loader: async ({ params }) => {
    const { data } = await supabase
      .from("profiles")
      .select("slug")
      .eq("user_id", params.userId)
      .maybeSingle();
    if (data?.slug) throw redirect({ to: "/artiste/$slug", params: { slug: data.slug }, replace: true });
    return {};
  },
  head: () => ({ meta: [{ title: "Profil | Mascartube" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <div className="px-4 pt-10 text-center">
      <p className="text-sm text-muted-foreground">Profil introuvable.</p>
      <Link to="/" className="mt-3 inline-block text-sm text-primary-glow">
        Retour
      </Link>
    </div>
  ),
});
