import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, jsonResult, supabaseForUser, unauthenticated } from "../supabase";

export default defineTool({
  name: "create_post",
  title: "Create a post",
  description:
    "Publish a text post to the Mascartube feed as the signed-in user. The post stays forever on the author's wall.",
  inputSchema: {
    content: z.string().trim().min(1).describe("Text content of the post."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ content }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const { data, error } = await supabaseForUser(ctx)
      .from("posts")
      .insert({ user_id: ctx.getUserId()!, content })
      .select("id, content, created_at")
      .single();
    if (error) return errorResult(error.message);
    return jsonResult(data, { post: data });
  },
});
