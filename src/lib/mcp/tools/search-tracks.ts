import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, jsonResult, supabaseForUser, unauthenticated } from "../supabase";

export default defineTool({
  name: "search_tracks",
  title: "Search public tracks",
  description:
    "Search the public Mascartube music catalog by title or genre and return matching tracks with play counts.",
  inputSchema: {
    query: z.string().optional().describe("Text to match against track titles."),
    genre: z.string().optional().describe("Exact genre to filter on, e.g. Afrobeat or Gasy."),
    limit: z.number().int().optional().describe("Maximum number of tracks to return (default 20)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, genre, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const max = Math.min(Math.max(limit ?? 20, 1), 50);
    let q = supabaseForUser(ctx)
      .from("tracks")
      .select("id, title, genre, plays, user_id, created_at")
      .order("plays", { ascending: false })
      .limit(max);
    if (query) q = q.ilike("title", `%${query}%`);
    if (genre) q = q.eq("genre", genre);
    const { data, error } = await q;
    if (error) return errorResult(error.message);
    const tracks = data ?? [];
    return jsonResult(tracks, { count: tracks.length, tracks });
  },
});
