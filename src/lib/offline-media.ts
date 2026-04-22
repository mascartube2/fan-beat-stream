import { openDB } from "idb";

export type OfflineMediaKind = "audio" | "video";

export type OfflineMediaRecord = {
  key: string;
  id: string;
  kind: OfflineMediaKind;
  title: string;
  artistName: string | null;
  sourceUrl: string;
  coverUrl: string | null;
  fileName: string | null;
  mimeType: string;
  size: number;
  createdAt: string;
  blob: Blob;
};

type DownloadOfflineInput = {
  id: string;
  kind: OfflineMediaKind;
  url: string;
  title: string;
  artistName?: string | null;
  coverUrl?: string | null;
  fileName?: string | null;
  onProgress?: (receivedBytes: number, totalBytes: number | null) => void;
};

const DB_NAME = "mascartube-offline";
const STORE_NAME = "media";
const objectUrlCache = new Map<string, string>();

function getDb() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "key" });
        store.createIndex("createdAt", "createdAt");
        store.createIndex("kind", "kind");
      }
    },
  });
}

export function makeOfflineMediaKey(kind: OfflineMediaKind, id: string) {
  return `${kind}:${id}`;
}

function emitOfflineMediaChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("offline-media:changed"));
  }
}

export async function getOfflineMedia(kind: OfflineMediaKind, id: string): Promise<OfflineMediaRecord | null> {
  const db = await getDb();
  const item = await db.get(STORE_NAME, makeOfflineMediaKey(kind, id));
  return item ?? null;
}

export async function hasOfflineMedia(kind: OfflineMediaKind, id: string): Promise<boolean> {
  const item = await getOfflineMedia(kind, id);
  return !!item;
}

export async function listOfflineMedia(): Promise<OfflineMediaRecord[]> {
  const db = await getDb();
  const items = await db.getAll(STORE_NAME);
  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function removeOfflineMedia(kind: OfflineMediaKind, id: string) {
  const key = makeOfflineMediaKey(kind, id);
  const db = await getDb();
  await db.delete(STORE_NAME, key);
  const cachedUrl = objectUrlCache.get(key);
  if (cachedUrl) {
    URL.revokeObjectURL(cachedUrl);
    objectUrlCache.delete(key);
  }
  emitOfflineMediaChanged();
}

export async function getOfflineMediaObjectUrl(kind: OfflineMediaKind, id: string): Promise<string | null> {
  const record = await getOfflineMedia(kind, id);
  if (!record) return null;

  const cachedUrl = objectUrlCache.get(record.key);
  if (cachedUrl) return cachedUrl;

  const objectUrl = URL.createObjectURL(record.blob);
  objectUrlCache.set(record.key, objectUrl);
  return objectUrl;
}

export async function getPreferredMediaUrl(kind: OfflineMediaKind, id: string, sourceUrl: string): Promise<string> {
  return (await getOfflineMediaObjectUrl(kind, id)) ?? sourceUrl;
}

export async function downloadOfflineMedia(input: DownloadOfflineInput): Promise<OfflineMediaRecord> {
  const existing = await getOfflineMedia(input.kind, input.id);
  if (existing) {
    input.onProgress?.(existing.size, existing.size);
    return existing;
  }

  const response = await fetch(input.url);
  if (!response.ok) {
    throw new Error(`Téléchargement impossible (HTTP ${response.status})`);
  }

  const totalBytesHeader = response.headers.get("content-length");
  const totalBytes = totalBytesHeader ? Number(totalBytesHeader) : null;
  const mimeType = response.headers.get("content-type") || "application/octet-stream";

  let blob: Blob;
  if (!response.body) {
    blob = await response.blob();
    input.onProgress?.(blob.size, blob.size);
  } else {
    const reader = response.body.getReader();
    const chunks: ArrayBuffer[] = [];
    let receivedBytes = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      const chunk = value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength) as ArrayBuffer;
      chunks.push(chunk);
      receivedBytes += value.byteLength;
      input.onProgress?.(receivedBytes, totalBytes);
    }

    blob = new Blob(chunks, { type: mimeType });
  }

  const record: OfflineMediaRecord = {
    key: makeOfflineMediaKey(input.kind, input.id),
    id: input.id,
    kind: input.kind,
    title: input.title,
    artistName: input.artistName ?? null,
    sourceUrl: input.url,
    coverUrl: input.coverUrl ?? null,
    fileName: input.fileName ?? null,
    mimeType: blob.type || mimeType,
    size: blob.size,
    createdAt: new Date().toISOString(),
    blob,
  };

  const db = await getDb();
  await db.put(STORE_NAME, record);
  emitOfflineMediaChanged();
  return record;
}