"use client";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useLofiAmbience } from "@/lib/hooks/useLofiAmbience";
import { useSpotifyConfig } from "@/lib/hooks/useSpotifyConfig";
import { parseSpotifyEmbedUrl } from "@/lib/utils/spotifyEmbed";
import { cn } from "@/lib/utils/cn";

interface MusicPanelProps {
  /** Lofi should be playing right now — tied to whatever "focus is active" means for the
   * caller (Pomodoro running in a session, or on the standalone /pomodoro page). */
  active: boolean;
  className?: string;
}

// Lofi ambience (generated locally) by default, swappable for the student's own Spotify
// playlist — shared by the study session's Pomodoro block and the standalone /pomodoro page so
// both stay in sync and in lockstep with the same saved link (see useSpotifyConfig).
export function MusicPanel({ active, className }: MusicPanelProps) {
  const lofi = useLofiAmbience();
  const spotify = useSpotifyConfig();
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [musicSource, setMusicSource] = useState<"lofi" | "spotify">("lofi");
  const [editingSpotify, setEditingSpotify] = useState(false);
  const [spotifyInput, setSpotifyInput] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (active && musicEnabled && musicSource === "lofi") lofi.start();
    else lofi.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, musicEnabled, musicSource]);

  async function handleSave() {
    setSaving(true);
    try {
      const embed = await spotify.save(spotifyInput);
      setEditingSpotify(false);
      if (embed) {
        setMusicSource("spotify");
        toast.success("Playlist salva.");
      } else if (spotifyInput.trim()) {
        toast.error("Link salvo, mas não reconheci como um link do Spotify — confira e tente de novo.");
      } else {
        setMusicSource("lofi");
        toast.success("Playlist removida — voltando pro lofi.");
      }
    } catch {
      toast.error("Não foi possível salvar o link.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={cn("rounded-xl border border-border bg-card p-3", className)}>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {spotify.embedUrl && (
            <div className="flex overflow-hidden rounded-md border border-border">
              <button
                type="button"
                onClick={() => setMusicSource("lofi")}
                className={cn(
                  "px-2 py-0.5 font-mono text-[10px]",
                  musicSource === "lofi" ? "bg-primary/15 text-primary" : "bg-transparent text-dim"
                )}
              >
                🎵 Lofi
              </button>
              <button
                type="button"
                onClick={() => setMusicSource("spotify")}
                className={cn(
                  "px-2 py-0.5 font-mono text-[10px]",
                  musicSource === "spotify" ? "bg-primary/15 text-primary" : "bg-transparent text-dim"
                )}
              >
                🎧 Spotify
              </button>
            </div>
          )}
          {!spotify.embedUrl && <span className="font-mono text-[10px] text-dim">🎵 Lofi ambiente</span>}
        </div>
        <div className="flex items-center gap-2">
          {!editingSpotify && (
            <button
              type="button"
              onClick={() => {
                setSpotifyInput(spotify.rawUrl);
                setEditingSpotify(true);
              }}
              title={spotify.embedUrl ? "Editar link do Spotify" : "Usar playlist do Spotify"}
              className="font-mono text-[10px] text-dim hover:text-txt"
            >
              {spotify.embedUrl ? "✏️" : "+ Spotify"}
            </button>
          )}
          {!editingSpotify && musicSource === "lofi" && (
            <button
              type="button"
              onClick={() => setMusicEnabled((v) => !v)}
              title={musicEnabled ? "Desligar música" : "Ligar música"}
              className="font-mono text-[10px] text-dim hover:text-txt"
            >
              {musicEnabled ? "🔊" : "🔇"}
            </button>
          )}
        </div>
      </div>

      {editingSpotify ? (
        <div>
          <div className="flex gap-1.5">
            <input
              autoFocus
              type="text"
              value={spotifyInput}
              onChange={(e) => setSpotifyInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
                if (e.key === "Escape") setEditingSpotify(false);
              }}
              placeholder="https://open.spotify.com/playlist/..."
              className="min-w-0 flex-1 rounded-md border border-border bg-card2 px-2 py-1 font-mono text-[10px] text-txt outline-none focus:border-primary/50"
            />
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-md bg-primary px-2 py-1 font-mono text-[10px] font-semibold text-bg"
            >
              {saving ? "..." : "Salvar"}
            </button>
            <button
              type="button"
              onClick={() => setEditingSpotify(false)}
              className="rounded-md border border-border px-2 py-1 font-mono text-[10px] text-dim"
            >
              Cancelar
            </button>
          </div>
          {spotifyInput.trim() && (
            <p className={`mt-1 text-[10px] ${parseSpotifyEmbedUrl(spotifyInput) ? "text-success" : "text-danger"}`}>
              {parseSpotifyEmbedUrl(spotifyInput) ? "✓ Link válido" : "✗ Não reconheci como link do Spotify"}
            </p>
          )}
        </div>
      ) : musicSource === "lofi" ? (
        <>
          {musicEnabled && (
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              defaultValue={0.3}
              onChange={(e) => lofi.setVolume(Number(e.target.value))}
              className="w-full accent-primary"
            />
          )}
          <p className="text-[10px] text-muted">
            Ambiente sonoro gerado localmente — toca enquanto o timer de foco/pausa estiver rodando.
          </p>
        </>
      ) : (
        <>
          <iframe
            title="Player do Spotify"
            src={spotify.embedUrl ?? undefined}
            width="100%"
            height="152"
            style={{ borderRadius: 8, border: "none" }}
            allow="autoplay; encrypted-media; clipboard-write; fullscreen; picture-in-picture"
            loading="lazy"
          />
          <p className="mt-1 text-[10px] text-muted">
            Pode ser preciso apertar play uma vez aqui dentro — o navegador nem sempre libera
            autoplay para o player embutido.
          </p>
        </>
      )}
    </div>
  );
}
