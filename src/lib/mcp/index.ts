import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getMyProfile from "./tools/get-my-profile";
import listMyTracks from "./tools/list-my-tracks";
import listMyShorts from "./tools/list-my-shorts";
import searchTracks from "./tools/search-tracks";
import createPost from "./tools/create-post";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "mascartube-mcp",
  title: "Mascartube",
  version: "0.1.0",
  instructions:
    "Tools for Mascartube, a music streaming and social app. Use `get_my_profile` for the signed-in user's profile, `list_my_tracks` and `list_my_shorts` for their uploads and reels stats, `search_tracks` to browse the public catalog, and `create_post` to publish a text post to the feed.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getMyProfile, listMyTracks, listMyShorts, searchTracks, createPost],
});
