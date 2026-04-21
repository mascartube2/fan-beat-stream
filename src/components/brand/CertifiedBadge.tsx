import { BadgeCheck } from "lucide-react";

export function CertifiedBadge({ className = "" }: { className?: string }) {
  return (
    <BadgeCheck
      className={`inline-block h-3.5 w-3.5 fill-sky-500 text-background ${className}`}
      aria-label="Compte certifié"
    />
  );
}
