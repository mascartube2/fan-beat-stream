import { defineTool } from "@lovable.dev/mcp-js";
import { errorResult, jsonResult, supabaseForUser, unauthenticated } from "../supabase";

export default defineTool({
  name: "get_my_profile",
  title: "Get my profile",
  description:
    "Get the signed-in Mascartube user's profile: display name, bio, country and certification status.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const { data, error } = await supabaseForUser(ctx)
      .from("profiles")
      .select("display_name, bio, country, is_certified, avatar_url, created_at")
      .eq("user_id", ctx.getUserId()!)
      .maybeSingle();
    if (error) return errorResult(error.message);
    if (!data) return errorResult("No profile found for this user.");
    return jsonResult(data, { profile: data });
  },
});
