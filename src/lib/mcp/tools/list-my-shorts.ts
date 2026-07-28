import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, jsonResult, supabaseForUser, unauthenticated } from "../supabase";

const ARCHIVE_DAYS = 30;

export default defineTool({
  name: "list_my_shorts",
  title: "List my reels",
  description:
    "List the signed-in artist's reels (shorts) with views, likes and whether each one is still active in the public feed or archived after 30 days.",
  inputSchema: {
    status: z
      .enum(["all", "active", "archived"])
      .optional()
      .describe("Filter by publication status (default all)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const { data, error } = await supabaseForUser(ctx)
      .from("shorts")
      .select("id, caption, views_count, likes_count, created_at")
      .eq("user_id", ctx.getUserId()!)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) return errorResult(error.message);
    const cutoff = Date.now() - ARCHIVE_DAYS * 24 * 3600 * 1000;
    const all = (data ?? []).map((s) => ({
      ...s,
      status: new Date(s.created_at).getTime() >= cutoff ? "active" : "archived",
    }));
    const filtered = !status || status === "all" ? all : all.filter((s) => s.status === status);
    return jsonResult(filtered, {
      count: filtered.length,
      active: all.filter((s) => s.status === "active").length,
      archived: all.filter((s) => s.status === "archived").length,
      shorts: filtered,
    });
  },
});
