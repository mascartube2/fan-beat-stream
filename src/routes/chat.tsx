import { createFileRoute } from "@tanstack/react-router";
import { Send, Search, BadgeCheck } from "lucide-react";
import { artists } from "@/lib/mock-data";

export const Route = createFileRoute("/chat")({
  component: ChatPage,
  head: () => ({ meta: [{ title: "Chat — Pulse" }] }),
});

const conversations = [
  { artistId: "a2", last: "Thanks for joining the live tonight 💜", time: "2m", unread: 2 },
  { artistId: "a1", last: "Drop coming next Friday — be ready 🌌", time: "1h", unread: 0 },
  { artistId: "a3", last: "You: That set was insane 🔥", time: "3h", unread: 0 },
];

function ChatPage() {
  return (
    <div className="px-4 pt-4">
      <h1 className="mb-4 text-2xl font-bold">Messages</h1>

      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          placeholder="Search conversations"
          className="w-full rounded-full border border-border bg-surface py-3 pl-10 pr-4 text-sm outline-none focus:border-primary"
        />
      </div>

      <div className="space-y-1">
        {conversations.map((c) => {
          const a = artists.find((x) => x.id === c.artistId)!;
          return (
            <button
              key={c.artistId}
              className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition hover:bg-surface/60"
            >
              <div className="relative">
                <img
                  src={a.avatar}
                  alt={a.name}
                  width={52}
                  height={52}
                  loading="lazy"
                  className="h-13 w-13 rounded-full object-cover"
                  style={{ height: 52, width: 52 }}
                />
                <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background bg-accent" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <p className="truncate text-sm font-semibold">{a.name}</p>
                  {a.verified && <BadgeCheck className="h-3.5 w-3.5 fill-primary text-primary-foreground" />}
                  <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">{c.time}</span>
                </div>
                <div className="flex items-center gap-2">
                  <p className="truncate text-xs text-muted-foreground">{c.last}</p>
                  {c.unread > 0 && (
                    <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-gradient-primary px-1.5 text-[10px] font-bold">
                      {c.unread}
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <button className="fixed bottom-36 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-primary shadow-glow active:scale-95">
        <Send className="h-5 w-5" />
      </button>
    </div>
  );
}
