import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";

const BASE_URL = "https://fan-beat-stream.lovable.app";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: SitemapEntry[] = [
          { path: "/", changefreq: "daily", priority: "1.0" },
          { path: "/discover", changefreq: "daily", priority: "0.9" },
          { path: "/musiques", changefreq: "daily", priority: "0.9" },
          { path: "/albums", changefreq: "daily", priority: "0.8" },
          { path: "/challenges", changefreq: "daily", priority: "0.8" },
          { path: "/shorts", changefreq: "daily", priority: "0.8" },
          { path: "/members", changefreq: "weekly", priority: "0.6" },
          { path: "/data-saver", changefreq: "monthly", priority: "0.5" },
          { path: "/pricing", changefreq: "monthly", priority: "0.5" },
          { path: "/become-artist", changefreq: "monthly", priority: "0.5" },
        ];

        const [tracks, profiles, challenges] = await Promise.all([
          supabase.from("tracks").select("id, slug, created_at").order("created_at", { ascending: false }).limit(5000),
          supabase.from("profiles").select("user_id, slug, updated_at").limit(5000),
          supabase.from("challenges").select("id, created_at").limit(1000),
        ]);

        for (const t of tracks.data ?? []) {
          entries.push({
            path: t.slug ? `/titre/${t.slug}` : `/track/${t.id}`,
            lastmod: t.created_at ? new Date(t.created_at).toISOString().slice(0, 10) : undefined,
            changefreq: "weekly",
            priority: "0.7",
          });
        }

        for (const p of profiles.data ?? []) {
          entries.push({
            path: p.slug ? `/artiste/${p.slug}` : `/u/${p.user_id}`,
            lastmod: p.updated_at ? new Date(p.updated_at).toISOString().slice(0, 10) : undefined,
            changefreq: "weekly",
            priority: "0.6",
          });
        }


        for (const c of challenges.data ?? []) {
          entries.push({
            path: `/challenge/${c.id}`,
            lastmod: c.created_at ? new Date(c.created_at).toISOString().slice(0, 10) : undefined,
            changefreq: "daily",
            priority: "0.6",
          });
        }

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
