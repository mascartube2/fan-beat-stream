import { Share2, Link2, Send } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Props = {
  url: string;
  title?: string;
  text?: string;
  className?: string;
  label?: string;
};

export function ShareMenu({ url, title, text, className, label }: Props) {
  const fullUrl = url.startsWith("http") ? url : `${window.location.origin}${url}`;
  const enc = encodeURIComponent;
  const msg = text ? `${text} — ${fullUrl}` : fullUrl;

  const nativeShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url: fullUrl });
      } else {
        await navigator.clipboard.writeText(fullUrl);
        toast.success("Lien copié");
      }
    } catch {
      /* user canceled */
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      toast.success("Lien copié");
    } catch {
      toast.error("Impossible de copier");
    }
  };

  const open = (href: string) => window.open(href, "_blank", "noopener,noreferrer");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={
          className ??
          "flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-white/5"
        }
        aria-label="Partager"
      >
        <Share2 className="h-4 w-4" />
        {label && <span>{label}</span>}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={nativeShare}>
          <Share2 className="mr-2 h-4 w-4" /> Partager…
        </DropdownMenuItem>
        <DropdownMenuItem onClick={copy}>
          <Link2 className="mr-2 h-4 w-4" /> Copier le lien
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => open(`https://wa.me/?text=${enc(msg)}`)}
        >
          <Send className="mr-2 h-4 w-4" /> WhatsApp
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => open(`https://www.facebook.com/sharer/sharer.php?u=${enc(fullUrl)}`)}
        >
          <Send className="mr-2 h-4 w-4" /> Facebook
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => open(`https://twitter.com/intent/tweet?url=${enc(fullUrl)}&text=${enc(text ?? title ?? "")}`)}
        >
          <Send className="mr-2 h-4 w-4" /> X / Twitter
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => open(`https://t.me/share/url?url=${enc(fullUrl)}&text=${enc(text ?? title ?? "")}`)}
        >
          <Send className="mr-2 h-4 w-4" /> Telegram
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
