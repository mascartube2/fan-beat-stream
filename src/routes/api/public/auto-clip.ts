import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

export const Route = createFileRoute("/api/public/auto-clip")({
  server: {
    handlers: {
      GET: async () => handle(),
      POST: async () => handle(),
    },
  },
});

async function handle() {
  const supabaseUrl = process.env.SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const lovableKey = process.env.LOVABLE_API_KEY!;
  const admin = createClient(supabaseUrl, serviceKey);

  // Lock rotation row
  const { data: rot } = await admin
    .from("auto_clip_rotation")
    .select("*")
    .eq("id", 1)
    .single();

  if (
    rot?.last_published_at &&
    new Date(rot.last_published_at).getTime() >
      Date.now() - 20 * 24 * 3600 * 1000
  ) {
    return Response.json({ skipped: "too_soon", last: rot.last_published_at });
  }

  // Pick next track (cycle), prefer ones with cover
  let track: any = null;
  if (rot?.last_track_id) {
    const { data: last } = await admin
      .from("tracks")
      .select("created_at")
      .eq("id", rot.last_track_id)
      .single();
    if (last) {
      const { data: next } = await admin
        .from("tracks")
        .select("*")
        .gt("created_at", last.created_at)
        .order("created_at", { ascending: true })
        .limit(1);
      track = next?.[0] ?? null;
    }
  }
  if (!track) {
    const { data: first } = await admin
      .from("tracks")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(1);
    track = first?.[0] ?? null;
  }
  if (!track) return Response.json({ error: "no_tracks" }, { status: 404 });

  const { data: profile } = await admin
    .from("profiles")
    .select("display_name")
    .eq("user_id", track.user_id)
    .single();
  const artistName = profile?.display_name ?? "Artiste Mascartube";

  // Generate AI poster image
  const prompt = `Affiche musicale moderne pour un clip audio, style éditorial premium, couleurs vibrantes dégradées violet-or-rose, ambiance énergique et lumineuse. Au centre en typographie bold massive : « ${track.title} ». En dessous plus petit : « ${artistName} ». En haut le logo texte stylisé « MASCARTUBE ». Coin bas droit : « CLIP DE LA QUINZAINE ${track.genre ?? "MUSIQUE"} ». Éléments graphiques : ondes sonores, équaliseur abstrait, particules lumineuses. Mise en page asymétrique cinématique. Format affiche 1:1.`;

  let imageBytes: Uint8Array | null = null;
  try {
    const aiRes = await fetch(
      "https://ai.gateway.lovable.dev/v1/images/generations",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3.1-flash-image-preview",
          messages: [{ role: "user", content: prompt }],
          modalities: ["image", "text"],
        }),
      },
    );
    if (aiRes.ok) {
      const json: any = await aiRes.json();
      const b64 = json?.data?.[0]?.b64_json;
      if (b64) {
        imageBytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      }
    } else {
      console.error("AI image gen failed:", aiRes.status, await aiRes.text());
    }
  } catch (e) {
    console.error("AI image gen error:", e);
  }

  // Upload generated poster (fallback to cover_path)
  let mediaPath: string | null = track.cover_path ?? null;
  if (imageBytes) {
    const filename = `auto-clip/${track.id}-${Date.now()}.png`;
    const { error: upErr } = await admin.storage
      .from("posts")
      .upload(filename, imageBytes, {
        contentType: "image/png",
        upsert: true,
      });
    if (!upErr) mediaPath = filename;
    else console.error("upload err", upErr);
  }

  const hashtag = `#${artistName.replace(/\s+/g, "")}`;
  const content =
    `🎬✨ CLIP DE LA QUINZAINE ✨🎬\n\n` +
    `🎵 « ${track.title} »\n` +
    `🎤 ${artistName}\n` +
    (track.genre ? `🎼 Genre : ${track.genre}\n` : "") +
    `\n🔥 Découvre le clip complet sur Mascartube\n` +
    `👉 /track/${track.id}\n\n` +
    `#ClipDuMois #Mascartube #Musique ${hashtag}`;

  const { data: post, error: postErr } = await admin
    .from("posts")
    .insert({
      user_id: track.user_id,
      content,
      media_path: mediaPath,
      media_type: mediaPath ? "image" : null,
    })
    .select()
    .single();
  if (postErr) return Response.json({ error: postErr.message }, { status: 500 });

  // ===== Générateur externe : vidéo Réel =====
  // Si un webhook externe est configuré (EXTERNAL_VIDEO_GENERATOR_URL),
  // on lui envoie la piste + l'affiche IA, et il doit renvoyer { video_url }.
  // On télécharge la vidéo, on l'upload sur le bucket "shorts", puis on crée
  // un Réel automatiquement.
  let shortId: string | null = null;
  let videoUrl: string | null = null;
  const generatorUrl = process.env.EXTERNAL_VIDEO_GENERATOR_URL;
  const generatorKey = process.env.EXTERNAL_VIDEO_GENERATOR_KEY;

  if (generatorUrl) {
    try {
      const posterPublicUrl = mediaPath
        ? admin.storage.from("posts").getPublicUrl(mediaPath).data.publicUrl
        : null;
      const audioPublicUrl = track.audio_path
        ? admin.storage.from("audio-tracks").getPublicUrl(track.audio_path).data.publicUrl
        : null;

      const genRes = await fetch(generatorUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(generatorKey ? { Authorization: `Bearer ${generatorKey}` } : {}),
        },
        body: JSON.stringify({
          title: track.title,
          artist: artistName,
          genre: track.genre ?? null,
          poster_url: posterPublicUrl,
          audio_url: audioPublicUrl,
          duration: 15,
          aspect_ratio: "9:16",
        }),
      });

      if (genRes.ok) {
        const gen: any = await genRes.json();
        videoUrl = gen?.video_url ?? gen?.url ?? null;
        if (videoUrl) {
          const vRes = await fetch(videoUrl);
          if (vRes.ok) {
            const bytes = new Uint8Array(await vRes.arrayBuffer());
            const ext = (videoUrl.split("?")[0].split(".").pop() || "mp4").slice(0, 5);
            const vPath = `auto-clip/${track.id}-${Date.now()}.${ext}`;
            const { error: vUpErr } = await admin.storage
              .from("shorts")
              .upload(vPath, bytes, {
                contentType: ext === "webm" ? "video/webm" : "video/mp4",
                upsert: true,
              });
            if (!vUpErr) {
              const { data: shortRow, error: shortErr } = await admin
                .from("shorts")
                .insert({
                  user_id: track.user_id,
                  video_path: vPath,
                  thumbnail_path: mediaPath,
                  caption: `🎬 ${track.title} — ${artistName}\n#Mascartube #ClipDuMois ${hashtag}`,
                })
                .select()
                .single();
              if (!shortErr) shortId = shortRow.id;
              else console.error("short insert err", shortErr);
            } else console.error("video upload err", vUpErr);
          } else console.error("video download failed:", vRes.status);
        } else console.error("generator returned no video_url", gen);
      } else {
        console.error("external generator failed:", genRes.status, await genRes.text());
      }
    } catch (e) {
      console.error("external generator error:", e);
    }
  }

  await admin
    .from("auto_clip_rotation")
    .update({ last_track_id: track.id, last_published_at: new Date().toISOString() })
    .eq("id", 1);

  return Response.json({
    success: true,
    track_id: track.id,
    post_id: post.id,
    short_id: shortId,
    media_path: mediaPath,
    ai_image: !!imageBytes,
    external_generator: !!generatorUrl,
    video_published: !!shortId,
  });
}

