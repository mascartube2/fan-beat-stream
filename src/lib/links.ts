/** Chemins canoniques (SEO + aperçu de partage). Repli sur les anciennes URLs si le slug manque. */
export function profilePath(slug?: string | null, userId?: string | null): string {
  return slug ? `/artiste/${slug}` : `/u/${userId ?? ""}`;
}

export function trackPath(slug?: string | null, trackId?: string | null): string {
  return slug ? `/titre/${slug}` : `/track/${trackId ?? ""}`;
}
