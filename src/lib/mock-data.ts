// Demo data removed — the app now uses real data from Lovable Cloud only.
export type Artist = {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  followers: string;
  verified: boolean;
  bio: string;
};

export type Post = {
  id: string;
  artistId: string;
  type: "release" | "live" | "story" | "text";
  content: string;
  cover?: string;
  trackId?: string;
  likes: number;
  comments: number;
  timeAgo: string;
};

export const artists: Artist[] = [];
export const posts: Post[] = [];
export const getArtist = (_id: string): Artist | undefined => undefined;
