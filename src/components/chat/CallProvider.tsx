import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { PhoneIncoming } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthContext";
import { VideoCall } from "@/components/chat/VideoCall";

type ActiveCall = { callId: string; peerId: string; isInitiator: boolean };
type Incoming = { callId: string; peerId: string; peerName: string };

type CallCtx = {
  startCall: (peerId: string) => void;
};

const Ctx = createContext<CallCtx | null>(null);

export function CallProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [call, setCall] = useState<ActiveCall | null>(null);
  const [incoming, setIncoming] = useState<Incoming | null>(null);
  const callRef = useRef<ActiveCall | null>(null);
  const incomingRef = useRef<Incoming | null>(null);

  callRef.current = call;
  incomingRef.current = incoming;

  // App-wide listener for incoming call offers (works on any page)
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`incoming-calls-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "call_signals", filter: `to_user=eq.${user.id}` },
        async (payload) => {
          const s = payload.new as { call_id: string; from_user: string; type: string };
          if (s.type !== "offer") return;
          if (callRef.current) return;
          if (incomingRef.current?.callId === s.call_id) return;
          let peerName = "Utilisateur";

          const { data } = await supabase
            .from("profiles")
            .select("display_name")
            .eq("user_id", s.from_user)
            .maybeSingle();
          if (data?.display_name) peerName = data.display_name;
          setIncoming({ callId: s.call_id, peerId: s.from_user, peerName });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user?.id]);

  const startCall = (peerId: string) => {
    if (!user) return;
    const callId = `${[user.id, peerId].sort().join("-")}-${Date.now()}`;
    setCall({ callId, peerId, isInitiator: true });
  };

  return (
    <Ctx.Provider value={{ startCall }}>
      {children}

      {call && user && (
        <VideoCall
          callId={call.callId}
          selfId={user.id}
          peerId={call.peerId}
          isInitiator={call.isInitiator}
          onClose={() => setCall(null)}
        />
      )}

      {incoming && !call && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-6">
          <div className="bg-gradient-card w-full max-w-xs rounded-2xl border border-border/50 p-5 text-center shadow-glow">
            <div className="mx-auto mb-3 flex h-14 w-14 animate-pulse items-center justify-center rounded-full bg-gradient-primary">
              <PhoneIncoming className="h-6 w-6" />
            </div>
            <p className="text-sm text-muted-foreground">Appel entrant de</p>
            <p className="mb-4 text-lg font-bold">{incoming.peerName}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setIncoming(null)}
                className="flex-1 rounded-full border border-border px-3 py-2.5 text-sm font-semibold"
              >
                Refuser
              </button>
              <button
                onClick={() => {
                  setCall({ callId: incoming.callId, peerId: incoming.peerId, isInitiator: false });
                  setIncoming(null);
                }}
                className="flex-1 rounded-full bg-gradient-primary px-3 py-2.5 text-sm font-bold shadow-glow"
              >
                Accepter
              </button>
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}

export const useCall = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCall must be used inside CallProvider");
  return v;
};
