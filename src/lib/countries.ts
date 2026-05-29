export type Country = { code: string; name: string; flag: string };

// Curated list — Madagascar first, then common francophone/African countries, then a wide world set.
export const COUNTRIES: Country[] = [
  { code: "MG", name: "Madagascar", flag: "🇲🇬" },
  { code: "FR", name: "France", flag: "🇫🇷" },
  { code: "RE", name: "La Réunion", flag: "🇷🇪" },
  { code: "MU", name: "Maurice", flag: "🇲🇺" },
  { code: "KM", name: "Comores", flag: "🇰🇲" },
  { code: "YT", name: "Mayotte", flag: "🇾🇹" },
  { code: "BE", name: "Belgique", flag: "🇧🇪" },
  { code: "CH", name: "Suisse", flag: "🇨🇭" },
  { code: "CA", name: "Canada", flag: "🇨🇦" },
  { code: "US", name: "États-Unis", flag: "🇺🇸" },
  { code: "GB", name: "Royaume-Uni", flag: "🇬🇧" },
  { code: "DE", name: "Allemagne", flag: "🇩🇪" },
  { code: "IT", name: "Italie", flag: "🇮🇹" },
  { code: "ES", name: "Espagne", flag: "🇪🇸" },
  { code: "PT", name: "Portugal", flag: "🇵🇹" },
  { code: "MA", name: "Maroc", flag: "🇲🇦" },
  { code: "DZ", name: "Algérie", flag: "🇩🇿" },
  { code: "TN", name: "Tunisie", flag: "🇹🇳" },
  { code: "SN", name: "Sénégal", flag: "🇸🇳" },
  { code: "CI", name: "Côte d'Ivoire", flag: "🇨🇮" },
  { code: "CM", name: "Cameroun", flag: "🇨🇲" },
  { code: "CD", name: "RD Congo", flag: "🇨🇩" },
  { code: "CG", name: "Congo", flag: "🇨🇬" },
  { code: "GA", name: "Gabon", flag: "🇬🇦" },
  { code: "BJ", name: "Bénin", flag: "🇧🇯" },
  { code: "BF", name: "Burkina Faso", flag: "🇧🇫" },
  { code: "ML", name: "Mali", flag: "🇲🇱" },
  { code: "NE", name: "Niger", flag: "🇳🇪" },
  { code: "TG", name: "Togo", flag: "🇹🇬" },
  { code: "GN", name: "Guinée", flag: "🇬🇳" },
  { code: "RW", name: "Rwanda", flag: "🇷🇼" },
  { code: "BI", name: "Burundi", flag: "🇧🇮" },
  { code: "ZA", name: "Afrique du Sud", flag: "🇿🇦" },
  { code: "KE", name: "Kenya", flag: "🇰🇪" },
  { code: "NG", name: "Nigéria", flag: "🇳🇬" },
  { code: "EG", name: "Égypte", flag: "🇪🇬" },
  { code: "BR", name: "Brésil", flag: "🇧🇷" },
  { code: "AR", name: "Argentine", flag: "🇦🇷" },
  { code: "MX", name: "Mexique", flag: "🇲🇽" },
  { code: "JP", name: "Japon", flag: "🇯🇵" },
  { code: "CN", name: "Chine", flag: "🇨🇳" },
  { code: "IN", name: "Inde", flag: "🇮🇳" },
  { code: "AU", name: "Australie", flag: "🇦🇺" },
  { code: "OTHER", name: "Autre", flag: "🌍" },
];

export function countryByCode(code: string | null | undefined): Country | null {
  if (!code) return null;
  return COUNTRIES.find((c) => c.code === code) ?? null;
}
