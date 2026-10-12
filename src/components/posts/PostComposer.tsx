import { Image as ImageIcon, Loader2, X, Send } from "lucide-react";
import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PublicationProgress } from "@/components/posts/PublicationProgress";
import { uploadMediaWithProgress, type PublicationStatus } from "@/lib/media-upload";

export function PostComposer({ onCreated }: { onCreated?: () => void }) {
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<PublicationStatus | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!user) return null;

  const pickFile = (f: File | null) => {
    if (!f) return;
    if (f.size > 50 * 1024 * 1024) {
      toast.error("Fichier trop lourd (max 50 Mo)");
      return;
    }
    setFile(f);
    setStatus(null);
    setPreview(URL.createObjectURL(f));
  };

  const submit = async () => {
    if (busy || (!text.trim() && !file)) return;
    setBusy(true);
    setStatus({ stage: file ? "preparing" : "publishing", fileName: file?.name, receivedBytes: 0, totalBytes: file?.size ?? 0 });
    try {
      let media_path: string | null = null;
      let media_type: string | null = null;
      if (file) {
        const ext = file.name.split(".").pop() ?? "bin";
        media_path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        media_type = file.type.startsWith("video/") ? "video" : "image";
        await uploadMediaWithProgress("posts", media_path, file, (receivedBytes) => {
          setStatus({ stage: "uploading", fileName: file.name, receivedBytes, totalBytes: file.size });
        });
      }
      setStatus((previous) => previous ? { ...previous, stage: "publishing" } : previous);
      const ins = await supabase.from("posts").insert({
        user_id: user.id,
        content: text.trim() || null,
        media_path,
        media_type,
      });
      if (ins.error) throw ins.error;
      setStatus((previous) => previous ? { ...previous, stage: "success" } : previous);
      setText("");
      setFile(null);
      setPreview(null);
      toast.success("Publication ajoutée");
      onCreated?.();
    } catch (e) {
      setStatus((previous) => previous ? { ...previous, stage: "error", error: (e as Error).message } : previous);
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-gradient-card mb-4 rounded-2xl border border-border/50 p-3 shadow-soft">
      <textarea
        value={text}
        disabled={busy}
        onChange={(e) => { setText(e.target.value); setStatus(null); }}
        placeholder="Quoi de neuf ?"
        rows={2}
        className="w-full resize-none rounded-lg bg-transparent px-1 py-1 text-sm outline-none placeholder:text-muted-foreground"
      />
      {preview && (
        <div className="relative mt-2 overflow-hidden rounded-xl">
          {file?.type.startsWith("video/") ? (
            <video src={preview} className="max-h-72 w-full" controls />
          ) : (
            <img src={preview} alt="" className="max-h-72 w-full object-cover" />
          )}
          <Button
            variant="secondary"
            size="icon"
            disabled={busy}
            aria-label="Retirer le fichier"
            onClick={() => {
              setFile(null);
              setPreview(null);
              setStatus(null);
            }}
            className="absolute right-2 top-2 rounded-full"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
      <PublicationProgress status={status} />
      <div className="mt-2 flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
          className="rounded-full text-muted-foreground"
        >
          <ImageIcon className="h-4 w-4" /> Photo / Vidéo
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          disabled={busy}
          onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
        />
        <Button
          size="sm"
          onClick={submit}
          disabled={busy || (!text.trim() && !file)}
          className="ml-auto flex items-center gap-1.5 rounded-full bg-gradient-primary px-4 py-1.5 text-xs font-bold shadow-glow disabled:opacity-40"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          {busy ? status?.stage === "publishing" ? "Publication…" : "Envoi…" : "Publier"}
        </Button>
      </div>
    </div>
  );
}
