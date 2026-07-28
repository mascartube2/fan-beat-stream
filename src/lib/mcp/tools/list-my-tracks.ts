import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, jsonResult, supabaseForUser, unauthenticated } from "../supabase";

export default defineTool({
  name: "list_my_tracks",
  title: "List my tracks",
  description:
    "List the signed-in artist's uploaded music tracks with title, genre, play count and sale settings.",
  inputSchema: {
    limit: z.number().int().optional().describe("Maximum number of tracks to return (default 20)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const max = Math.min(Math.max(limit ?? 20, 1), 100);
    const { data, error } = await supabaseForUser(ctx)
      .from("tracks")
      .select("id, title, genre, plays, duration_seconds, is_for_sale, price_ar, created_at")
      .eq("user_id", ctx.getUserId()!)
      .order("created_at", { ascending: false })
      .limit(max);
    if (error) return errorResult(error.message);
    const tracks = data ?? [];
    return jsonResult(tracks, {
      count: tracks.length,
      total_plays: tracks.reduce((s, t) => s + (t.plays ?? 0), 0),
      tracks,
    });
  },
});
