import { createFileRoute, Link } from "@tanstack/react-router";
import { Send, Search, ArrowLeft, Loader2, Video, Paperclip, Mic, Smile, Check, CheckCheck, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthContext";
import { useCall } from "@/components/chat/CallProvider";
import { ReactionPicker } from "@/components/chat/ReactionPicker";
import { uploadChatMedia } from "@/lib/chat-media";
import { isOnline } from "@/hooks/use-presence";
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
  media_url: string | null;
  media_type: string | null;
  read_at: string | null;
  created_at: string;
};

type Reaction = { id: string; message_id: string; user_id: string; emoji: string };
type Profile = { user_id: string; display_name: string | null; avatar_url: string | null };

const EMOJIS = ["😀","😂","🥰","😍","😎","😢","😡","👍","👏","🙏","🔥","❤️","💯","🎉","🎵","✨"];

function ChatPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [profiles, setProfiles] = useState<Map<string, Profile>>(new Map());
  const [presence, setPresence] = useState<Map<string, string>>(new Map());
  const [activePeer, setActivePeer] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [peerTyping, setPeerTyping] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const [recording, setRecording] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimeoutRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const { startCall } = useCall();


  const loadAll = async () => {
    if (!user) return;
    const { data: msgs } = await supabase
      .from("messages")
      .select("*")
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order("created_at", { ascending: true });
    const msgList = (msgs as Msg[]) ?? [];
    setMessages(msgList);
    const peerIds = Array.from(
      new Set(msgList.map((m) => (m.sender_id === user.id ? m.recipient_id : m.sender_id))),
    );
    if (peerIds.length) {
      const [{ data: profs }, { data: pres }, { data: rxns }] = await Promise.all([
        supabase.from("profiles").select("user_id,display_name,avatar_url").in("user_id", peerIds),
        supabase.from("user_presence").select("user_id,last_seen_at").in("user_id", peerIds),
        supabase.from("message_reactions").select("*").in("message_id", msgList.map((m) => m.id)),
      ]);
      setProfiles(new Map((profs ?? []).map((p) => [p.user_id, p])));
      setPresence(new Map((pres ?? []).map((p) => [p.user_id, p.last_seen_at])));
      setReactions((rxns as Reaction[]) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    loadAll();
    const ch = supabase
      .channel("messages-feed")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const m = payload.new as Msg;
        if (m.sender_id === user.id || m.recipient_id === user.id) {
          setMessages((prev) => (prev.some((p) => p.id === m.id) ? prev : [...prev, m]));
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages" }, (payload) => {
        const m = payload.new as Msg;
        setMessages((prev) => prev.map((p) => (p.id === m.id ? { ...p, ...m } : p)));
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "message_reactions" }, (payload) => {
        setReactions((prev) => [...prev, payload.new as Reaction]);
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "message_reactions" }, (payload) => {
        const old = payload.old as Reaction;
        setReactions((prev) => prev.filter((r) => r.id !== old.id));
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user?.id]);



  // Typing channel per active thread
  useEffect(() => {
    if (!user || !activePeer) return;
    const key = [user.id, activePeer].sort().join("-");
    const ch = supabase.channel(`typing-${key}`, { config: { broadcast: { self: false } } });
    ch.on("broadcast", { event: "typing" }, ({ payload }) => {
      if (payload?.from === activePeer) {
        setPeerTyping(true);
        window.setTimeout(() => setPeerTyping(false), 2500);
      }
    }).subscribe();
    typingChannelRef.current = ch;
    return () => {
      supabase.removeChannel(ch);
      typingChannelRef.current = null;
      setPeerTyping(false);
    };
  }, [user?.id, activePeer]);

  const sendTyping = () => {
    if (!user || !typingChannelRef.current) return;
    if (typingTimeoutRef.current) return;
    typingChannelRef.current.send({ type: "broadcast", event: "typing", payload: { from: user.id } });
    typingTimeoutRef.current = window.setTimeout(() => {
      typingTimeoutRef.current = null;
    }, 1500);
  };



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

  const send = async (overrides?: { content?: string; media_url?: string; media_type?: string }) => {
    if (!user || !activePeer) return;
    const content = (overrides?.content ?? draft).trim();
    if (!content && !overrides?.media_url) return;
    setDraft("");
    const { error } = await supabase.from("messages").insert({
      sender_id: user.id,
      recipient_id: activePeer,
      content,
      media_url: overrides?.media_url ?? null,
      media_type: overrides?.media_type ?? null,
    });
    if (error) toast.error(error.message);
  };

  const handleFile = async (file: File) => {
    if (!user) return;
    if (file.size > 20 * 1024 * 1024) {
      toast.error("Fichier trop volumineux (max 20 Mo)");
      return;
    }
    try {
      setUploading(true);
      const { url, type } = await uploadChatMedia(user.id, file);
      await send({ content: "", media_url: url, media_type: type });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const toggleReaction = async (messageId: string, emoji: string) => {
    if (!user) return;
    const existing = reactions.find((r) => r.message_id === messageId && r.user_id === user.id && r.emoji === emoji);
    if (existing) {
      await supabase.from("message_reactions").delete().eq("id", existing.id);
    } else {
      await supabase.from("message_reactions").insert({ message_id: messageId, user_id: user.id, emoji });
    }
  };

  const startRecording = async () => {
    if (!user || recording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => chunks.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: "audio/webm" });
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: "audio/webm" });
        await handleFile(file);
      };
      rec.start();
      mediaRecorderRef.current = rec;
      setRecording(true);
    } catch (e) {
      toast.error("Micro inaccessible");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    setRecording(false);
  };

  if (!user) {
    return (
      <div className="px-4 pt-10 text-center">
        <h1 className="mb-2 text-xl font-bold">Messages</h1>
        <p className="mb-4 text-sm text-muted-foreground">Connecte-toi pour discuter avec les artistes et tes fans.</p>
        <Link to="/auth" className="inline-block rounded-full bg-gradient-primary px-5 py-2 text-sm font-bold shadow-glow">
          Se connecter
        </Link>
      </div>
    );
  }

  // THREAD VIEW
  if (activePeer) {
    const peer = profiles.get(activePeer);
    const peerOnline = isOnline(presence.get(activePeer));
    return (
      <>
        <div className="flex h-[calc(100vh-9rem)] flex-col">

          <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border/40 bg-background/95 px-4 py-3 backdrop-blur">
            <button onClick={() => setActivePeer(null)} className="rounded-full p-1 hover:bg-white/5">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="relative">
              {peer?.avatar_url ? (
                <img src={peer.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
              ) : (
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface text-xs font-bold">
                  {(peer?.display_name ?? "U").slice(0, 2).toUpperCase()}
                </span>
              )}
              {peerOnline && <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background bg-emerald-500" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{peer?.display_name ?? "Utilisateur"}</p>
              <p className="text-[10px] text-muted-foreground">
                {peerTyping ? "écrit…" : peerOnline ? "En ligne" : "Hors ligne"}
              </p>
            </div>
            <button
              onClick={() => startCall(activePeer)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-primary shadow-glow"
              aria-label="Appel vidéo"
            >
              <Video className="h-4 w-4" />
            </button>
          </header>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {activeMessages.map((m) => {
              const mine = m.sender_id === user.id;
              const msgReactions = reactions.filter((r) => r.message_id === m.id);
              const reactionGroups = msgReactions.reduce<Record<string, number>>((acc, r) => {
                acc[r.emoji] = (acc[r.emoji] ?? 0) + 1;
                return acc;
              }, {});
              return (
                <div key={m.id} className={`group flex flex-col ${mine ? "items-end" : "items-start"}`}>
                  <div className={`flex max-w-[78%] items-center gap-1 ${mine ? "flex-row-reverse" : ""}`}>
                    <div
                      className={`relative rounded-2xl px-3.5 py-2 text-sm ${
                        mine ? "bg-gradient-primary" : "bg-surface"
                      } ${m.media_url && !m.content ? "p-1" : ""}`}
                    >
                      {m.media_url && m.media_type === "image" && (
                        <img src={m.media_url} alt="" className="max-h-64 rounded-xl object-cover" />
                      )}
                      {m.media_url && m.media_type === "audio" && (
                        <audio src={m.media_url} controls className="h-9 max-w-[220px]" />
                      )}
                      {m.media_url && m.media_type === "video" && (
                        <video src={m.media_url} controls className="max-h-64 rounded-xl" />
                      )}
                      {m.media_url && m.media_type === "file" && (
                        <a href={m.media_url} target="_blank" rel="noreferrer" className="underline">
                          📎 Fichier
                        </a>
                      )}
                      {m.content && <p className={m.media_url ? "mt-1.5" : ""}>{m.content}</p>}
                      <div className={`mt-0.5 flex items-center gap-1 text-right text-[9px] opacity-60 ${mine ? "justify-end" : ""}`}>
                        {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        {mine && (m.read_at ? <CheckCheck className="h-3 w-3 text-sky-300" /> : <Check className="h-3 w-3" />)}
                      </div>
                    </div>
                    <div className="opacity-0 transition group-hover:opacity-100">
                      <ReactionPicker onPick={(e) => toggleReaction(m.id, e)} />
                    </div>
                  </div>
                  {Object.keys(reactionGroups).length > 0 && (
                    <div className={`mt-0.5 flex flex-wrap gap-1 ${mine ? "justify-end" : ""}`}>
                      {Object.entries(reactionGroups).map(([emoji, count]) => {
                        const mineReacted = msgReactions.some((r) => r.emoji === emoji && r.user_id === user.id);
                        return (
                          <button
                            key={emoji}
                            onClick={() => toggleReaction(m.id, emoji)}
                            className={`flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[10px] ${
                              mineReacted ? "border-primary/60 bg-primary/20" : "border-border/40 bg-surface"
                            }`}
                          >
                            <span>{emoji}</span>
                            <span className="text-muted-foreground">{count}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
            {peerTyping && (
              <div className="flex items-end gap-1 text-xs text-muted-foreground">
                <span className="flex gap-0.5 rounded-2xl bg-surface px-3 py-2">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" />
                </span>
              </div>
            )}
          </div>

          {showEmojis && (
            <div className="border-t border-border/40 bg-background/95 p-2 backdrop-blur">
              <div className="flex flex-wrap gap-1">
                {EMOJIS.map((e) => (
                  <button
                    key={e}
                    onClick={() => {
                      setDraft((d) => d + e);
                      setShowEmojis(false);
                    }}
                    className="rounded-lg p-1.5 text-xl transition hover:bg-white/10"
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="sticky bottom-20 flex items-end gap-1.5 border-t border-border/40 bg-background/95 p-2 backdrop-blur">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,audio/*,video/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = "";
              }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-white/10 disabled:opacity-40"
              aria-label="Joindre un fichier"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
            </button>
            <button
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              onTouchStart={startRecording}
              onTouchEnd={stopRecording}
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${recording ? "bg-red-500 animate-pulse" : "hover:bg-white/10"}`}
              aria-label="Message vocal"
            >
              <Mic className="h-4 w-4" />
            </button>
            <button
              onClick={() => setShowEmojis((v) => !v)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-white/10"
              aria-label="Emoji"
            >
              {showEmojis ? <X className="h-4 w-4" /> : <Smile className="h-4 w-4" />}
            </button>
            <input
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                sendTyping();
              }}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Aa"
              className="flex-1 rounded-full border border-border bg-surface px-4 py-2 text-sm outline-none focus:border-primary"
            />
            <button
              onClick={() => send()}
              disabled={!draft.trim()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-primary disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </>
    );
  }

  // CONVERSATION LIST
  return (
    <>

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
              const online = isOnline(presence.get(c.peerId));
              const preview = c.last.content || (c.last.media_type === "image" ? "📷 Photo" : c.last.media_type === "audio" ? "🎤 Vocal" : c.last.media_type === "video" ? "🎬 Vidéo" : "📎 Fichier");
              return (
                <button
                  key={c.peerId}
                  onClick={() => setActivePeer(c.peerId)}
                  className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition hover:bg-surface/60"
                >
                  <div className="relative" style={{ height: 52, width: 52 }}>
                    {p?.avatar_url ? (
                      <img src={p.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center rounded-full bg-surface text-sm font-bold">
                        {(p?.display_name ?? "U").slice(0, 2).toUpperCase()}
                      </span>
                    )}
                    {online && <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background bg-emerald-500" />}
                  </div>
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
                        {preview}
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
    </>
  );
}

