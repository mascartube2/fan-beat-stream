import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Download, Copy } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  url: string;
  title?: string;
};

export function QrDialog({ open, onOpenChange, url, title }: Props) {
  const [dataUrl, setDataUrl] = useState<string>("");

  useEffect(() => {
    if (!open || !url) return;
    QRCode.toDataURL(url, {
      width: 512,
      margin: 2,
      color: { dark: "#000000", light: "#ffffff" },
    })
      .then(setDataUrl)
      .catch(() => toast.error("Impossible de générer le QR code"));
  }, [open, url]);

  const download = () => {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `qr-${(title ?? "mascartube").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.png`;
    a.click();
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Lien copié");
    } catch {
      toast.error("Impossible de copier");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle>{title ?? "Partager"}</DialogTitle>
          <DialogDescription className="truncate text-xs">{url}</DialogDescription>
        </DialogHeader>
        <div className="flex justify-center rounded-xl bg-white p-3">
          {dataUrl ? (
            <img src={dataUrl} alt="QR code" className="h-56 w-56" />
          ) : (
            <div className="h-56 w-56 animate-pulse rounded bg-muted" />
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={copyLink}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-border px-3 py-2 text-xs hover:bg-white/5"
          >
            <Copy className="h-3.5 w-3.5" /> Copier
          </button>
          <button
            onClick={download}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-gradient-primary px-3 py-2 text-xs font-bold"
          >
            <Download className="h-3.5 w-3.5" /> Enregistrer
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
