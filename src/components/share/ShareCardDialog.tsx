import { useEffect, useState } from "react";
import { Download, Loader2, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { generateShareCard, shareCardFileName, type ShareCardInput } from "@/lib/share-card";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  card: ShareCardInput;
};

export function ShareCardDialog({ open, onOpenChange, card }: Props) {
  const [url, setUrl] = useState<string>("");
  const [blob, setBlob] = useState<Blob | null>(null);

  useEffect(() => {
    if (!open) return;
    let revoke: string | null = null;
    setUrl("");
    generateShareCard(card)
      .then((b) => {
        setBlob(b);
        revoke = URL.createObjectURL(b);
        setUrl(revoke);
      })
      .catch(() => toast.error("Impossible de générer la carte"));
    return () => {
      if (revoke) URL.revokeObjectURL(revoke);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, card.url, card.title, card.coverUrl]);

  const save = () => {
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = shareCardFileName(card.title);
    a.click();
    toast.success("Carte enregistrée");
  };

  const share = async () => {
    if (!blob) return;
    const file = new File([blob], shareCardFileName(card.title), { type: "image/png" });
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: card.title, text: `${card.title} — ${card.url}` });
      } else {
        save();
      }
    } catch {
      /* annulé */
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Carte de partage</DialogTitle>
          <DialogDescription className="text-xs">
            Image 1080×1080 prête pour Facebook, TikTok ou WhatsApp.
          </DialogDescription>
        </DialogHeader>
        <div className="flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-border/50 bg-muted">
          {url ? (
            <img src={url} alt={`Carte de partage — ${card.title}`} className="h-full w-full object-cover" />
          ) : (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={save}
            disabled={!url}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-border px-3 py-2 text-xs disabled:opacity-50 hover:bg-white/5"
          >
            <Download className="h-3.5 w-3.5" /> Enregistrer
          </button>
          <button
            onClick={share}
            disabled={!url}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-gradient-primary px-3 py-2 text-xs font-bold disabled:opacity-50"
          >
            <Share2 className="h-3.5 w-3.5" /> Partager l'image
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
