import { Image as ImageIcon, Loader2, X, Send } from "lucide-react";
import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthContext";
import { toast } from "sonner";

export function PostComposer({ onCreated }: { onCreated?: () => void }) {
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!user) return null;

  const pickFile = (f: File | null) => {
    if (!f) return;
    if (f.size > 50 * 1024 * 1024) {
      toast.error("Fichier trop lourd (max 50 Mo)");
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const submit = async () => {
    if (!text.trim() && !file) return;
    setBusy(true);
    try {
      let media_path: string | null = null;
      let media_type: string | null = null;
      if (file) {
        const ext = file.name.split(".").pop() ?? "bin";
        media_path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        media_type = file.type.startsWith("video/") ? "video" : "image";
        const up = await supabase.storage.from("posts").upload(media_path, file, { contentType: file.type });
        if (up.error) throw up.error;
      }
      const ins = await supabase.from("posts").insert({
        user_id: user.id,
        content: text.trim() || null,
        media_path,
        media_type,
      });
      if (ins.error) throw ins.error;
      setText("");
      setFile(null);
      setPreview(null);
      toast.success("Publication ajoutée");
      onCreated?.();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-gradient-card mb-4 rounded-2xl border border-border/50 p-3 shadow-soft">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
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
          <button
            onClick={() => {
              setFile(null);
              setPreview(null);
            }}
            className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      <div className="mt-2 flex items-center gap-2">
        <button
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-muted-foreground hover:bg-white/5"
        >
          <ImageIcon className="h-4 w-4" /> Photo / Vidéo
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
        />
        <button
          onClick={submit}
          disabled={busy || (!text.trim() && !file)}
          className="ml-auto flex items-center gap-1.5 rounded-full bg-gradient-primary px-4 py-1.5 text-xs font-bold shadow-glow disabled:opacity-40"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          Publier
        </button>
      </div>
    </div>
  );
}
