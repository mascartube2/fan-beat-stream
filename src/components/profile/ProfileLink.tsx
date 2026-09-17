import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

/** Lien vers un profil : /artiste/nom-artiste quand le slug existe, sinon ancienne URL /u/:id. */
export function ProfileLink({
  userId,
  slug,
  className,
  children,
}: {
  userId: string;
  slug?: string | null;
  className?: string;
  children: ReactNode;
}) {
  if (slug) {
    return (
      <Link to="/artiste/$slug" params={{ slug }} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <Link to="/u/$userId" params={{ userId }} className={className}>
      {children}
    </Link>
  );
}
