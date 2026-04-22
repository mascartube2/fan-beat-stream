import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getOfflineMediaObjectUrl,
  hasOfflineMedia,
  listOfflineMedia,
  removeOfflineMedia,
  type OfflineMediaKind,
  type OfflineMediaRecord,
} from "@/lib/offline-media";

export function useOfflineStatus(kind: OfflineMediaKind, id: string) {
  const [downloaded, setDownloaded] = useState(false);

  const refresh = useCallback(async () => {
    setDownloaded(await hasOfflineMedia(kind, id));
  }, [id, kind]);

  useEffect(() => {
    void refresh();
    const onChanged = () => void refresh();
    window.addEventListener("offline-media:changed", onChanged);
    return () => window.removeEventListener("offline-media:changed", onChanged);
  }, [refresh]);

  return { downloaded, refresh };
}

export function useOfflineMediaUrl(kind: OfflineMediaKind, id: string, fallbackUrl: string) {
  const [url, setUrl] = useState(fallbackUrl);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const preferred = await getOfflineMediaObjectUrl(kind, id);
      if (mounted) setUrl(preferred ?? fallbackUrl);
    };

    void load();
    const onChanged = () => void load();
    window.addEventListener("offline-media:changed", onChanged);
    return () => {
      mounted = false;
      window.removeEventListener("offline-media:changed", onChanged);
    };
  }, [fallbackUrl, id, kind]);

  return url;
}

export function useOfflineLibrary() {
  const [items, setItems] = useState<OfflineMediaRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setItems(await listOfflineMedia());
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
    const onChanged = () => void refresh();
    window.addEventListener("offline-media:changed", onChanged);
    return () => window.removeEventListener("offline-media:changed", onChanged);
  }, [refresh]);

  const removeItem = useCallback(async (kind: OfflineMediaKind, id: string) => {
    await removeOfflineMedia(kind, id);
  }, []);

  const grouped = useMemo(
    () => ({
      audio: items.filter((item) => item.kind === "audio"),
      video: items.filter((item) => item.kind === "video"),
    }),
    [items],
  );

  return { items, grouped, loading, refresh, removeItem };
}