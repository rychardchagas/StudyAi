import { describe, expect, it } from "vitest";
import { parseSpotifyEmbedUrl } from "./spotifyEmbed";

describe("parseSpotifyEmbedUrl", () => {
  it("converts a playlist URL to an embed URL", () => {
    expect(parseSpotifyEmbedUrl("https://open.spotify.com/playlist/37i9dQZF1DWWQRwui0ExPn")).toBe(
      "https://open.spotify.com/embed/playlist/37i9dQZF1DWWQRwui0ExPn?utm_source=generator&theme=0"
    );
  });

  it("handles album/track/artist links and the intl-xx locale prefix", () => {
    expect(parseSpotifyEmbedUrl("https://open.spotify.com/album/1ATL5GLyefJaxhQzSPVrLX")).toContain(
      "/embed/album/1ATL5GLyefJaxhQzSPVrLX"
    );
    expect(parseSpotifyEmbedUrl("https://open.spotify.com/intl-pt/track/4uLU6hMCjMI75M1A2tKUQC")).toContain(
      "/embed/track/4uLU6hMCjMI75M1A2tKUQC"
    );
  });

  it("ignores query params and extra path junk", () => {
    expect(
      parseSpotifyEmbedUrl("https://open.spotify.com/playlist/37i9dQZF1DWWQRwui0ExPn?si=abc123&utm_source=copy-link")
    ).toBe("https://open.spotify.com/embed/playlist/37i9dQZF1DWWQRwui0ExPn?utm_source=generator&theme=0");
  });

  it("rejects non-Spotify or malformed input instead of ever passing it through raw", () => {
    expect(parseSpotifyEmbedUrl("")).toBeNull();
    expect(parseSpotifyEmbedUrl("javascript:alert(1)")).toBeNull();
    expect(parseSpotifyEmbedUrl("https://evil.example.com/open.spotify.com/playlist/abc")).toBeNull();
    expect(parseSpotifyEmbedUrl("https://open.spotify.com/user/someone")).toBeNull();
    expect(parseSpotifyEmbedUrl("not a url at all")).toBeNull();
  });
});
