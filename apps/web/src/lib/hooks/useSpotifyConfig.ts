"use client";
import { useCallback, useEffect, useState } from "react";
import { parseSpotifyEmbedUrl } from "@/lib/utils/spotifyEmbed";

// Shared by SessionClient and PomodoroClient (MusicPanel) — reads/writes the same
// preferences.pomodoro.spotifyUrl the timer-duration config also lives in (see
// usePomodoroConfig), so saving here must merge into that object too.
export function useSpotifyConfig() {
  const [rawUrl, setRawUrl] = useState("");
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/profile");
        if (!res.ok) return;
        const profile = await res.json();
        const raw = profile?.preferences?.pomodoro?.spotifyUrl;
        if (typeof raw === "string" && raw.trim()) {
          setRawUrl(raw);
          setEmbedUrl(parseSpotifyEmbedUrl(raw));
        }
      } catch {
        // keep defaults
      }
    })();
  }, []);

  const save = useCallback(async (url: string): Promise<string | null> => {
    const trimmed = url.trim();
    const current = await (await fetch("/api/profile")).json();
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        preferences: {
          ...(current.preferences ?? {}),
          pomodoro: { ...(current.preferences?.pomodoro ?? {}), spotifyUrl: trimmed },
        },
      }),
    });
    if (!res.ok) throw new Error("save failed");
    setRawUrl(trimmed);
    const embed = parseSpotifyEmbedUrl(trimmed);
    setEmbedUrl(embed);
    return embed;
  }, []);

  return { rawUrl, embedUrl, save };
}
