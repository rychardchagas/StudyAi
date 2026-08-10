// Converts a pasted Spotify link (playlist/album/track/etc) into an embeddable player URL.
// Never use the pasted string directly as an iframe src — it's unvalidated input the user could
// paste from anywhere. This only ever returns a URL under https://open.spotify.com/embed/,
// rebuilt from a type allowlist + a regex-extracted alphanumeric ID, or null if the input doesn't
// match a real Spotify link at all. Parses with the real URL API (exact hostname match) rather
// than a bare substring regex, so "https://evil.example/open.spotify.com/playlist/..." (the
// hostname string appearing in the *path*, not as the actual host) correctly fails instead of
// slipping through — the output is always hardcoded to the real domain regardless, so this isn't
// exploitable either way, but a validator that says "Spotify link" should mean it.
const EMBED_PATH_PATTERN = /^\/(?:intl-[a-z]{2}\/)?(playlist|album|track|artist|show|episode)\/([a-zA-Z0-9]{10,30})/i;

export function parseSpotifyEmbedUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  if (url.hostname !== "open.spotify.com") return null;
  const match = url.pathname.match(EMBED_PATH_PATTERN);
  if (!match) return null;
  const [, type, id] = match;
  return `https://open.spotify.com/embed/${type.toLowerCase()}/${id}?utm_source=generator&theme=0`;
}
