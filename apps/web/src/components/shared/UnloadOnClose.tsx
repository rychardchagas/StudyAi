"use client";
// Frees the Ollama model from memory the moment the tab/browser actually closes, instead of
// relying only on OLLAMA_KEEP_ALIVE's fixed idle timer — a short timer means frequent (visible,
// on Windows) model reloads during normal active use with gaps between AI calls; a long one means
// memory sits reserved after the user is done. Tying it to the real close event fixes both.
import { useEffect } from "react";

export function UnloadOnClose() {
  useEffect(() => {
    function handlePageHide() {
      // sendBeacon is the only reliable way to fire a request during unload — a normal fetch()
      // can get cancelled mid-flight once the page starts tearing down.
      navigator.sendBeacon("/api/system/unload");
    }
    // pagehide (not beforeunload) — fires on real navigation-away/tab-close without blocking the
    // back/forward cache, and still fires when the browser itself closes.
    window.addEventListener("pagehide", handlePageHide);
    return () => window.removeEventListener("pagehide", handlePageHide);
  }, []);

  return null;
}
