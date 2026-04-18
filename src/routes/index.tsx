import { createFileRoute } from "@tanstack/react-router";
import { Bell, Search } from "lucide-react";
import { StoriesRow } from "@/components/feed/StoriesRow";
import { PostCard } from "@/components/feed/PostCard";
import { posts } from "@/lib/mock-data";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <div className="px-4 pt-4">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">Welcome back</p>
          <h1 className="text-2xl font-bold tracking-tight">
            <span className="text-gradient">Pulse</span>
          </h1>
        </div>
        <div className="flex items-center gap-1">
          <button className="rounded-full p-2.5 hover:bg-white/5" aria-label="Search">
            <Search className="h-5 w-5" />
          </button>
          <button className="relative rounded-full p-2.5 hover:bg-white/5" aria-label="Notifications">
            <Bell className="h-5 w-5" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary-glow" />
          </button>
        </div>
      </header>

      <section className="mb-5">
        <StoriesRow />
      </section>

      <section className="space-y-4">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </section>
    </div>
  );
}
