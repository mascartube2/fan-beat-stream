import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Heart, MessageSquare, MessageCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthContext";

export const Route = createFileRoute("/notifications")({
  component: NotificationsPage,
});

type Item = {
  id: string;
  kind: "like" | "comment" | "message";
  actorName: string;
  actorAvatar: string | null;
  text: string;
  createdAt: string;
  href: string;
};

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}min`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}j`;
}

function NotificationsPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    let cancelled = false;
    (async () => {
      const { data: myPosts } = await supabase
        .from("posts")
        .select("id")
        .eq("user_id", user.id);
      const postIds = (myPosts ?? []).map((p) => p.id);

      const [likesRes, commentsRes, msgsRes] = await Promise.all([
        postIds.length
          ? supabase
              .from("post_likes")
              .select("id,post_id,user_id,created_at")
              .in("post_id", postIds)
              .neq("user_id", user.id)
              .order("created_at", { ascending: false })
              .limit(30)
          : Promise.resolve({ data: [] as any[] }),
        postIds.length
          ? supabase
              .from("post_comments")
              .select("id,post_id,user_id,content,created_at")
              .in("post_id", postIds)
              .neq("user_id", user.id)
              .order("created_at", { ascending: false })
              .limit(30)
          : Promise.resolve({ data: [] as any[] }),
        supabase
          .from("messages")
          .select("id,sender_id,content,created_at,read_at")
          .eq("recipient_id", user.id)
          .is("read_at", null)
          .order("created_at", { ascending: false })
          .limit(30),
      ]);

      const userIds = new Set<string>();
      (likesRes.data ?? []).forEach((l: any) => userIds.add(l.user_id));
      (commentsRes.data ?? []).forEach((c: any) => userIds.add(c.user_id));
      (msgsRes.data ?? []).forEach((m: any) => userIds.add(m.sender_id));

      const { data: profs } = userIds.size
        ? await supabase
            .from("profiles")
            .select("user_id,display_name,avatar_url")
            .in("user_id", Array.from(userIds))
        : { data: [] as any[] };
      const pmap = new Map((profs ?? []).map((p: any) => [p.user_id, p]));
      const pname = (uid: string) => pmap.get(uid)?.display_name ?? "Quelqu'un";
      const pav = (uid: string) => pmap.get(uid)?.avatar_url ?? null;

      const list: Item[] = [
        ...(likesRes.data ?? []).map((l: any) => ({
          id: `like-${l.id}`,
          kind: "like" as const,
          actorName: pname(l.user_id),
          actorAvatar: pav(l.user_id),
          text: "a aimé ta publication",
          createdAt: l.created_at,
          href: `/post/${l.post_id}`,
        })),
        ...(commentsRes.data ?? []).map((c: any) => ({
          id: `cmt-${c.id}`,
          kind: "comment" as const,
          actorName: pname(c.user_id),
          actorAvatar: pav(c.user_id),
          text: `a commenté : "${(c.content ?? "").slice(0, 60)}"`,
          createdAt: c.created_at,
          href: `/post/${c.post_id}`,
        })),
        ...(msgsRes.data ?? []).map((m: any) => ({
          id: `msg-${m.id}`,
          kind: "message" as const,
          actorName: pname(m.sender_id),
          actorAvatar: pav(m.sender_id),
          text: `nouveau message : "${(m.content ?? "").slice(0, 60)}"`,
          createdAt: m.created_at,
          href: `/chat`,
        })),
      ].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));

      if (!cancelled) {
        setItems(list);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading, navigate]);

  return (
    <div className="px-4 pt-4">
      <header className="mb-4 flex items-center gap-2">
        <Link to="/" className="rounded-full p-2 hover:bg-white/5" aria-label="Retour">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-bold">Notifications</h1>
      </header>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Aucune notification pour le moment.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((n) => (
            <li key={n.id}>
              <Link
                to={n.href}
                className="flex items-center gap-3 rounded-xl bg-surface/50 p-3 transition hover:bg-surface"
              >
                <div className="relative">
                  {n.actorAvatar ? (
                    <img
                      src={n.actorAvatar}
                      alt=""
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-primary text-sm font-bold">
                      {n.actorName.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-background">
                    {n.kind === "like" ? (
                      <Heart className="h-3 w-3 fill-red-500 text-red-500" />
                    ) : n.kind === "comment" ? (
                      <MessageSquare className="h-3 w-3 text-primary-glow" />
                    ) : (
                      <MessageCircle className="h-3 w-3 text-primary-glow" />
                    )}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">
                    <span className="font-semibold">{n.actorName}</span>{" "}
                    <span className="text-muted-foreground">{n.text}</span>
                  </p>
                  <p className="text-[10px] text-muted-foreground">{timeAgo(n.createdAt)}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
