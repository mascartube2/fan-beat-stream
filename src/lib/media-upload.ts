import { supabase } from "@/integrations/supabase/client";

export type PublicationStatus = {
  stage: "preparing" | "uploading" | "publishing" | "success" | "error";
  fileName?: string;
  receivedBytes: number;
  totalBytes: number;
  error?: string;
};

/** Browser-only transport: percentages come from bytes sent, never a timer. */
export async function uploadMediaWithProgress(
  bucket: string,
  path: string,
  file: File,
  onProgress: (receivedBytes: number) => void,
) {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!data.session) throw new Error("Reconnecte-toi pour publier.");

  const objectPath = path.split("/").map(encodeURIComponent).join("/");
  const url = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/${encodeURIComponent(bucket)}/${objectPath}`;
  await new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", url);
    request.setRequestHeader("Authorization", `Bearer ${data.session.access_token}`);
    request.setRequestHeader("apikey", import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
    request.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    request.setRequestHeader("Cache-Control", "max-age=3600");
    request.setRequestHeader("x-upsert", "false");
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.min(file.size, event.loaded));
    };
    request.onerror = () => reject(new Error("Envoi interrompu. Vérifie ta connexion puis réessaie."));
    request.onabort = () => reject(new Error("Envoi annulé."));
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        onProgress(file.size);
        resolve();
        return;
      }
      let message = "Impossible d’envoyer le fichier. Réessaie.";
      try {
        const response = JSON.parse(request.responseText);
        message = response.message || response.error || message;
      } catch { /* Keep the fallback for non-JSON errors. */ }
      reject(new Error(message));
    };
    request.send(file);
  });
}