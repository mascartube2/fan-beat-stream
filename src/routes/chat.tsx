import { createFileRoute, Link } from "@tanstack/react-router";
import { Send, Search, ArrowLeft, Loader2, Video, PhoneIncoming } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthContext";
import { VideoCall } from "@/components/chat/VideoCall";
import { toast } from "sonner";

export const Route = createFileRoute("/chat")({
  component: ChatPage,
  head: () => ({ meta: [{ title: "Messages — Pulse" }] }),
});

type Msg = {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  read_at: string | null;
  created_at: string;
};

type Profile = { user_id: string; display_name: string | null; avatar_url: string | null };

function ChatPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [profiles, setProfiles] = useState<Map<string, Profile>>(new Map());
  const [activePeer, setActivePeer] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [call, setCall] = useState<{ callId: string; peerId: string; isInitiator: boolean } | null>(null);
  const [incoming, setIncoming] = useState<{ callId: string; peerId: string } | null>(null);

  // Load all messages involving me + their profiles
  const loadAll = async () => {
    if (!user) return;
    const { data: msgs } = await supabase
      .from("messages")
      .select("*")
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order("created_at", { ascending: true });
    setMessages((msgs as Msg[]) ?? []);
    const peerIds = Array.from(
      new Set(((msgs as Msg[]) ?? []).map((m) => (m.sender_id === user.id ? m.recipient_id : m.sender_id))),
    );
    if (peerIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id,display_name,avatar_url")
        .in("user_id", peerIds);
      setProfiles(new Map((profs ?? []).map((p) => [p.user_id, p])));
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    loadAll();
    const ch = supabase
      .channel("messages-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const m = payload.new as Msg;
          if (m.sender_id === user.id || m.recipient_id === user.id) {
            setMessages((prev) => [...prev, m]);
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user?.id]);

  // Listen for incoming calls (offers addressed to me)
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel("incoming-calls")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "call_signals", filter: `to_user=eq.${user.id}` },
        (payload) => {
          const s = payload.new as { call_id: string; from_user: string; type: string };
          if (s.type === "offer" && !call && (!incoming || incoming.callId !== s.call_id)) {
            setIncoming({ callId: s.call_id, peerId: s.from_user });
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user?.id, call, incoming]);

  const startCall = (peerId: string) => {
    if (!user) return;
    const callId = `${[user.id, peerId].sort().join("-")}-${Date.now()}`;
    setCall({ callId, peerId, isInitiator: true });
  };

  // Conversations grouped by peer
  const conversations = useMemo(() => {
    if (!user) return [];
    const map = new Map<string, { peerId: string; last: Msg; unread: number }>();
    for (const m of messages) {
      const peerId = m.sender_id === user.id ? m.recipient_id : m.sender_id;
      const existing = map.get(peerId);
      const unreadInc = m.recipient_id === user.id && !m.read_at ? 1 : 0;
      if (!existing || new Date(m.created_at) > new Date(existing.last.created_at)) {
        map.set(peerId, { peerId, last: m, unread: (existing?.unread ?? 0) + unreadInc });
      } else {
        existing.unread += unreadInc;
      }
    }
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.last.created_at).getTime() - new Date(a.last.created_at).getTime(),
    );
  }, [messages, user?.id]);

  const activeMessages = useMemo(
    () =>
      activePeer && user
        ? messages.filter(
            (m) =>
              (m.sender_id === user.id && m.recipient_id === activePeer) ||
              (m.sender_id === activePeer && m.recipient_id === user.id),
          )
        : [],
    [messages, activePeer, user?.id],
  );

  // Mark as read when opening a thread
  useEffect(() => {
    if (!activePeer || !user) return;
    const unread = activeMessages.filter((m) => m.recipient_id === user.id && !m.read_at).map((m) => m.id);
    if (unread.length) {
      supabase
        .from("messages")
        .update({ read_at: new Date().toISOString() })
        .in("id", unread)
        .then(() => loadAll());
    }
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }));
  }, [activePeer, activeMessages.length]);

  // Search users
  useEffect(() => {
    if (!search.trim()) {
      setSearchResults([]);
      return;
    }
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id,display_name,avatar_url")
        .ilike("display_name", `%${search.trim()}%`)
        .limit(10);
      setSearchResults((data ?? []).filter((p) => p.user_id !== user?.id));
    }, 250);
    return () => clearTimeout(t);
  }, [search, user?.id]);

  const send = async () => {
    if (!user || !activePeer || !draft.trim()) return;
    const content = draft.trim();
    setDraft("");
    const { error } = await supabase
      .from("messages")
      .insert({ sender_id: user.id, recipient_id: activePeer, content });
    if (error) toast.error(error.message);
  };

  if (!user) {
    return (
      <div className="px-4 pt-10 text-center">
        <h1 className="mb-2 text-xl font-bold">Messages</h1>
        <p className="mb-4 text-sm text-muted-foreground">Connecte-toi pour discuter avec les artistes.</p>
        <Link to="/auth" className="inline-block rounded-full bg-gradient-primary px-5 py-2 text-sm font-bold shadow-glow">
          Se connecter
        </Link>
      </div>
    );
  }

  // THREAD VIEW
  if (activePeer) {
    const peer = profiles.get(activePeer);
    return (
      <>
        {call && (
          <VideoCall
            callId={call.callId}
            selfId={user.id}
            peerId={call.peerId}
            isInitiator={call.isInitiator}
            onClose={() => setCall(null)}
          />
        )}
        {incoming && !call && (
          <IncomingCallModal
            peerName={profiles.get(incoming.peerId)?.display_name ?? "Utilisateur"}
            onAccept={() => {
              setCall({ callId: incoming.callId, peerId: incoming.peerId, isInitiator: false });
              setIncoming(null);
            }}
            onDecline={() => setIncoming(null)}
          />
        )}
      <div className="flex h-[calc(100vh-9rem)] flex-col">
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border/40 bg-background/95 px-4 py-3 backdrop-blur">
          <button onClick={() => setActivePeer(null)} className="rounded-full p-1 hover:bg-white/5">
            <ArrowLeft className="h-5 w-5" />
          </button>
          {peer?.avatar_url ? (
            <img src={peer.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
          ) : (
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface text-xs font-bold">
              {(peer?.display_name ?? "U").slice(0, 2).toUpperCase()}
            </span>
          )}
          <p className="flex-1 font-semibold">{peer?.display_name ?? "Utilisateur"}</p>
          <button
            onClick={() => startCall(activePeer)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-primary shadow-glow"
            aria-label="Appel vidéo"
          >
            <Video className="h-4 w-4" />
          </button>
        </header>

        <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto px-4 py-3">
          {activeMessages.map((m) => {
            const mine = m.sender_id === user.id;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${
                    mine ? "bg-gradient-primary" : "bg-surface"
                  }`}
                >
                  {m.content}
                  <div className="mt-0.5 text-right text-[9px] opacity-60">
                    {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="sticky bottom-20 flex gap-2 border-t border-border/40 bg-background/95 p-3 backdrop-blur">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Écris un message…"
            className="flex-1 rounded-full border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-primary"
          />
          <button
            onClick={send}
            disabled={!draft.trim()}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-primary disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  // CONVERSATION LIST
  return (
    <div className="px-4 pt-4">
      <h1 className="mb-4 text-2xl font-bold">Messages</h1>

      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Chercher un utilisateur ou artiste"
          className="w-full rounded-full border border-border bg-surface py-3 pl-10 pr-4 text-sm outline-none focus:border-primary"
        />
      </div>

      {searchResults.length > 0 && (
        <div className="mb-5 space-y-1">
          <p className="mb-1 text-xs font-semibold text-muted-foreground">Démarrer une conversation</p>
          {searchResults.map((p) => (
            <button
              key={p.user_id}
              onClick={() => {
                setProfiles((prev) => new Map(prev).set(p.user_id, p));
                setActivePeer(p.user_id);
                setSearch("");
                setSearchResults([]);
              }}
              className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left hover:bg-surface/60"
            >
              {p.avatar_url ? (
                <img src={p.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
              ) : (
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface text-xs font-bold">
                  {(p.display_name ?? "U").slice(0, 2).toUpperCase()}
                </span>
              )}
              <span className="text-sm font-semibold">{p.display_name ?? "Utilisateur"}</span>
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <Loader2 className="mx-auto mt-10 h-5 w-5 animate-spin text-muted-foreground" />
      ) : conversations.length === 0 ? (
        <p className="mt-10 text-center text-sm text-muted-foreground">
          Aucune conversation — cherche un utilisateur ci-dessus pour commencer.
        </p>
      ) : (
        <div className="space-y-1">
          {conversations.map((c) => {
            const p = profiles.get(c.peerId);
            const mine = c.last.sender_id === user.id;
            return (
              <button
                key={c.peerId}
                onClick={() => setActivePeer(c.peerId)}
                className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition hover:bg-surface/60"
              >
                {p?.avatar_url ? (
                  <img src={p.avatar_url} alt="" className="h-13 w-13 rounded-full object-cover" style={{ height: 52, width: 52 }} />
                ) : (
                  <span className="flex h-13 w-13 items-center justify-center rounded-full bg-surface text-sm font-bold" style={{ height: 52, width: 52 }}>
                    {(p?.display_name ?? "U").slice(0, 2).toUpperCase()}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <p className="truncate text-sm font-semibold">{p?.display_name ?? "Utilisateur"}</p>
                    <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
                      {new Date(c.last.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="truncate text-xs text-muted-foreground">
                      {mine && "Toi: "}
                      {c.last.content}
                    </p>
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
      )}
    </div>
  );
}
