import { useEffect, useRef, useState } from "react";
import { PhoneOff, Mic, MicOff, Video as VideoIcon, VideoOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ICE = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }],
};

type Props = {
  callId: string;
  selfId: string;
  peerId: string;
  isInitiator: boolean;
  onClose: () => void;
};

export function VideoCall({ callId, selfId, peerId, isInitiator, onClose }: Props) {
  const localRef = useRef<HTMLVideoElement>(null);
  const remoteRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [status, setStatus] = useState("Connexion…");

  useEffect(() => {
    let alive = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let remoteSet = false;
    const pendingIce: RTCIceCandidateInit[] = [];
    const handledIds = new Set<string>();

    const send = async (type: string, payload: any = null) => {
      await supabase.from("call_signals").insert({ call_id: callId, from_user: selfId, to_user: peerId, type, payload });
    };

    const start = async () => {
      let pc: RTCPeerConnection;
      try {
    const start = async () => {
      let pc: RTCPeerConnection;
      try {
        if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== "function") {
          throw new Error("Caméra/micro non disponibles dans ce navigateur. Sur l'app mobile ou un domaine HTTPS, l'appel fonctionnera.");
        }
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (!alive) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        localStreamRef.current = stream;
        if (localRef.current) localRef.current.srcObject = stream;

        pc = new RTCPeerConnection(ICE);
        pcRef.current = pc;
        stream.getTracks().forEach((t) => pc.addTrack(t, stream));

        pc.ontrack = (e) => {
          if (remoteRef.current) remoteRef.current.srcObject = e.streams[0];
          setStatus("");
        };
        pc.onicecandidate = (e) => {
          if (e.candidate) send("ice", e.candidate.toJSON());
        };
        pc.onconnectionstatechange = () => {
          if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
            toast.error("Connexion perdue");
            cleanup();
          }
        };
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Caméra/micro refusé";
        toast.error(msg);
        onClose();
        return;
      }

      const drainIce = async () => {
        while (pendingIce.length) {
          const c = pendingIce.shift()!;
          try {
            await pc.addIceCandidate(new RTCIceCandidate(c));
          } catch (err) {
            console.error("ice err", err);
          }
        }
      };

      const handleSignal = async (id: string, type: string, payload: any) => {
        if (id && handledIds.has(id)) return;
        if (id) handledIds.add(id);
        try {
          if (type === "offer") {
            if (isInitiator) return;
            await pc.setRemoteDescription(new RTCSessionDescription(payload));
            remoteSet = true;
            await drainIce();
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            await send("answer", answer);
            setStatus("Connexion…");
          } else if (type === "answer") {
            await pc.setRemoteDescription(new RTCSessionDescription(payload));
            remoteSet = true;
            await drainIce();
          } else if (type === "ice") {
            if (remoteSet) {
              await pc.addIceCandidate(new RTCIceCandidate(payload));
            } else {
              pendingIce.push(payload);
            }
          } else if (type === "bye") {
            cleanup();
          }
        } catch (err) {
          console.error("signal err", err);
        }
      };

      channel = supabase
        .channel(`call-${callId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "call_signals", filter: `call_id=eq.${callId}` },
          (p) => {
            const s = p.new as { id: string; from_user: string; type: string; payload: any };
            if (s.from_user === selfId) return;
            void handleSignal(s.id, s.type, s.payload);
          },
        )
        .subscribe(async (st) => {
          if (st !== "SUBSCRIBED" || !alive) return;
          if (isInitiator) {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            await send("offer", offer);
            setStatus("Appel en cours…");
          } else {
            setStatus("Connexion…");
            // The offer was likely inserted before we subscribed — fetch it now.
            const { data } = await supabase
              .from("call_signals")
              .select("id, from_user, type, payload")
              .eq("call_id", callId)
              .neq("from_user", selfId)
              .order("created_at", { ascending: true });
            for (const s of data ?? []) {
              await handleSignal(s.id, s.type, s.payload);
            }
          }
        });
    };

    const cleanup = () => {
      alive = false;
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      pcRef.current?.close();
      if (channel) supabase.removeChannel(channel);
      onClose();
    };

    start();

    return () => {
      alive = false;
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      pcRef.current?.close();
      if (channel) supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callId]);


  const hangup = async () => {
    await supabase.from("call_signals").insert({ call_id: callId, from_user: selfId, to_user: peerId, type: "bye", payload: null });
    onClose();
  };

  const toggleMute = () => {
    const t = localStreamRef.current?.getAudioTracks()[0];
    if (t) {
      t.enabled = !t.enabled;
      setMuted(!t.enabled);
    }
  };
  const toggleCam = () => {
    const t = localStreamRef.current?.getVideoTracks()[0];
    if (t) {
      t.enabled = !t.enabled;
      setCamOff(!t.enabled);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-black">
      <video ref={remoteRef} autoPlay playsInline className="absolute inset-0 h-full w-full object-cover" />
      <video ref={localRef} autoPlay playsInline muted className="absolute right-3 top-3 z-10 h-32 w-24 rounded-lg border border-white/20 object-cover" />
      {status && (
        <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/60 px-4 py-2 text-sm">
          {status}
        </div>
      )}
      <div className="absolute bottom-8 left-0 right-0 z-10 flex items-center justify-center gap-4">
        <button onClick={toggleMute} className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 backdrop-blur">
          {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </button>
        <button onClick={hangup} className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive">
          <PhoneOff className="h-6 w-6" />
        </button>
        <button onClick={toggleCam} className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 backdrop-blur">
          {camOff ? <VideoOff className="h-5 w-5" /> : <VideoIcon className="h-5 w-5" />}
        </button>
      </div>
    </div>
  );
}
