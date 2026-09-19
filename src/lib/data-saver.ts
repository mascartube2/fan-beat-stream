/** Mode data-light : économiser les données mobiles (3G Madagascar). */
const ENABLED_KEY = "mascartube:data-saver";
const SAVED_KEY = "mascartube:data-saved-bytes";
export const DATA_SAVER_EVENT = "data-saver:changed";

/** Estimations moyennes utilisées pour le compteur d'économie. */
export const SAVED_ESTIMATE = {
  cover: 45_000, // pochette non chargée
  avatar: 12_000, // photo de profil non chargée
  videoAutoplay: 1_800_000, // réel qui ne démarre plus tout seul
  audioPrefetch: 240_000, // préchargement audio désactivé
};

export function isDataSaverEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(ENABLED_KEY) === "1";
}

export function setDataSaverEnabled(enabled: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ENABLED_KEY, enabled ? "1" : "0");
  window.dispatchEvent(new CustomEvent(DATA_SAVER_EVENT));
}

export function getSavedBytes(): number {
  if (typeof window === "undefined") return 0;
  return Number(window.localStorage.getItem(SAVED_KEY) ?? 0) || 0;
}

export function addSavedBytes(bytes: number) {
  if (typeof window === "undefined" || bytes <= 0) return;
  window.localStorage.setItem(SAVED_KEY, String(getSavedBytes() + bytes));
  window.dispatchEvent(new CustomEvent(DATA_SAVER_EVENT));
}

export function resetSavedBytes() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SAVED_KEY, "0");
  window.dispatchEvent(new CustomEvent(DATA_SAVER_EVENT));
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} Go`;
}

type NetworkInfo = { effectiveType?: string; saveData?: boolean; downlink?: number };

export function getNetworkInfo(): NetworkInfo | null {
  if (typeof navigator === "undefined") return null;
  const conn = (navigator as unknown as { connection?: NetworkInfo }).connection;
  return conn ?? null;
}

/** Vrai quand le téléphone est sur un réseau lent ou demande l'économie de données. */
export function isSlowNetwork(): boolean {
  const info = getNetworkInfo();
  if (!info) return false;
  if (info.saveData) return true;
  return ["slow-2g", "2g", "3g"].includes(info.effectiveType ?? "");
}
