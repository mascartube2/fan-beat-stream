import { useEffect, useState } from "react";
import { Download } from "lucide-react";

/** Shows how many times an album was downloaded; updates live after a download. */
export function AlbumDownloadCount({ albumId, initial }: { albumId: string; initial?: number | null }) {
  const [count, setCount] = useState(initial ?? 0);
  useEffect(() => setCount(initial ?? 0), [initial]);
  useEffect(() => {
    const onDl = (e: Event) => {
      const d = (e as CustomEvent<{ albumId: string; count: number }>).detail;
      if (d?.albumId === albumId) setCount(d.count);
    };
    window.addEventListener("album-downloaded", onDl);
    return () => window.removeEventListener("album-downloaded", onDl);
  }, [albumId]);
  return (
    <span className="inline-flex items-center gap-0.5">
      <Download className="h-3 w-3" />
      {count} {count > 1 ? "téléchargements" : "téléchargement"}
    </span>
  );
}
