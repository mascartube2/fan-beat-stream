import { useEffect, useRef, useState } from "react";
import { ImageOff } from "lucide-react";
import { useDataSaver } from "@/components/data/DataSaverContext";
import { SAVED_ESTIMATE } from "@/lib/data-saver";

type Props = {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  /** Octets estimés économisés quand l'image n'est pas chargée. */
  estimatedBytes?: number;
  /** Rendu compact (avatars) : pas de texte, juste un bloc gris. */
  compact?: boolean;
};

/**
 * Image respectant le mode data-light : en mode économie, l'image n'est pas
 * téléchargée — un bloc léger s'affiche et l'utilisateur peut la charger d'un tap.
 */
export function DataImage({ src, alt, className, width, height, estimatedBytes, compact }: Props) {
  const { enabled, recordSaving } = useDataSaver();
  const [forceLoad, setForceLoad] = useState(false);
  const counted = useRef(false);

  const skipping = enabled && !forceLoad;

  useEffect(() => {
    if (skipping && !counted.current) {
      counted.current = true;
      recordSaving(estimatedBytes ?? SAVED_ESTIMATE.cover);
    }
  }, [skipping, estimatedBytes, recordSaving]);

  useEffect(() => {
    setForceLoad(false);
    counted.current = false;
  }, [src]);

  if (skipping) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setForceLoad(true);
        }}
        aria-label={`Charger l'image : ${alt}`}
        className={`flex items-center justify-center bg-surface text-muted-foreground ${className ?? ""}`}
      >
        {compact ? (
          <ImageOff className="h-3 w-3 opacity-60" />
        ) : (
          <span className="flex flex-col items-center gap-1 px-1 text-center">
            <ImageOff className="h-4 w-4 opacity-70" />
            <span className="text-[9px] font-semibold leading-tight">Afficher</span>
          </span>
        )}
      </button>
    );
  }

  return <img src={src} alt={alt} width={width} height={height} loading="lazy" decoding="async" className={className} />;
}
