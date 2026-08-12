import { useEffect, useMemo, useState } from "react";
import { Copy, RefreshCw, Send } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { buildHashtags, buildShareText, type ShareTextInput } from "@/lib/share-text";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  input: ShareTextInput;
};

export function ShareTextDialog({ open, onOpenChange, input }: Props) {
  const generated = useMemo(() => buildShareText(input), [input]);
  const hashtags = useMemo(() => buildHashtags(input), [input]);
  const [value, setValue] = useState(generated);

  useEffect(() => {
    if (open) setValue(generated);
  }, [open, generated]);

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copié`);
    } catch {
      toast.error("Impossible de copier");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Texte de partage</DialogTitle>
          <DialogDescription className="text-xs">
            Auto-rempli selon la page. Modifie-le si tu veux, puis copie-colle sur Facebook, TikTok
            ou WhatsApp.
          </DialogDescription>
        </DialogHeader>

        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={9}
          className="w-full resize-none rounded-xl border border-border/60 bg-background/60 p-3 text-xs leading-relaxed outline-none focus:border-primary/60"
        />

        <div className="flex flex-wrap gap-1.5">
          {hashtags.map((t) => (
            <button
              key={t}
              onClick={() => copy(t, t)}
              className="rounded-full border border-border/60 px-2 py-1 text-[10px] text-muted-foreground hover:bg-white/5"
            >
              {t}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setValue(generated)}
            className="flex items-center justify-center gap-1.5 rounded-full border border-border px-3 py-2 text-xs hover:bg-white/5"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Réinitialiser
          </button>
          <button
            onClick={() => copy(hashtags.join(" "), "Hashtags")}
            className="flex items-center justify-center gap-1.5 rounded-full border border-border px-3 py-2 text-xs hover:bg-white/5"
          >
            <Send className="h-3.5 w-3.5" /> Hashtags
          </button>
          <button
            onClick={() => copy(value, "Texte")}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-gradient-primary px-3 py-2 text-xs font-bold"
          >
            <Copy className="h-3.5 w-3.5" /> Copier tout
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
