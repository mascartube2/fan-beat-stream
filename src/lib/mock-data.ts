import cover1 from "@/assets/cover-1.jpg";
import cover2 from "@/assets/cover-2.jpg";
import cover3 from "@/assets/cover-3.jpg";
import cover4 from "@/assets/cover-4.jpg";
import artist1 from "@/assets/artist-1.jpg";
import artist2 from "@/assets/artist-2.jpg";
import artist3 from "@/assets/artist-3.jpg";

export type Artist = {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  followers: string;
  verified: boolean;
  bio: string;
};

export type Track = {
  id: string;
  title: string;
  artistId: string;
  cover: string;
  duration: string;
  plays: string;
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

export const artists: Artist[] = [
  {
    id: "a1",
    name: "Nova Lux",
    handle: "@novalux",
    avatar: artist1,
    followers: "284K",
    verified: true,
    bio: "Synthwave producer 🌌 New EP out now",
  },
  {
    id: "a2",
    name: "Mira Vey",
    handle: "@miravey",
    avatar: artist2,
    followers: "1.2M",
    verified: true,
    bio: "Singer · songwriter · dreamer ✨",
  },
  {
    id: "a3",
    name: "DJ Onyx",
    handle: "@djonyx",
    avatar: artist3,
    followers: "512K",
    verified: true,
    bio: "Live every Friday 🎧",
  },
];

export const tracks: Track[] = [
  { id: "t1", title: "Midnight Pulse", artistId: "a1", cover: cover1, duration: "3:24", plays: "2.4M" },
  { id: "t2", title: "Indigo Skies", artistId: "a2", cover: cover3, duration: "4:01", plays: "8.1M" },
  { id: "t3", title: "Neon Streets", artistId: "a3", cover: cover2, duration: "2:58", plays: "1.7M" },
  { id: "t4", title: "Violet Dreams", artistId: "a1", cover: cover4, duration: "3:45", plays: "920K" },
  { id: "t5", title: "After Dark", artistId: "a2", cover: cover1, duration: "3:12", plays: "3.3M" },
  { id: "t6", title: "Lost Frequency", artistId: "a3", cover: cover3, duration: "4:22", plays: "1.1M" },
];

export const posts: Post[] = [
  {
    id: "p1",
    artistId: "a2",
    type: "release",
    content: "New single 'Indigo Skies' is OUT NOW 💜 Tell me what you think in the comments!",
    cover: cover3,
    trackId: "t2",
    likes: 12483,
    comments: 842,
    timeAgo: "2h",
  },
  {
    id: "p2",
    artistId: "a3",
    type: "live",
    content: "Going LIVE in 30min — special set for you guys 🔥",
    likes: 3421,
    comments: 198,
    timeAgo: "30m",
  },
  {
    id: "p3",
    artistId: "a1",
    type: "release",
    content: "Studio session vibes. Drop coming next week 🌌",
    cover: cover1,
    trackId: "t1",
    likes: 8920,
    comments: 421,
    timeAgo: "5h",
  },
  {
    id: "p4",
    artistId: "a2",
    type: "text",
    content: "Thank you for 1.2M ❤️ This community means everything.",
    likes: 24102,
    comments: 1820,
    timeAgo: "1d",
  },
];

export const getArtist = (id: string) => artists.find((a) => a.id === id);
export const getTrack = (id: string) => tracks.find((t) => t.id === id);
