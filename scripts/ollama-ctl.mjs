#!/usr/bin/env node
// Manual start/stop for the local Ollama server, so it isn't consuming memory whenever the
// project isn't running. Ollama's Windows install auto-starts a tray app on every login by
// default — that's disabled for this machine; use `pnpm ai:start` / `pnpm ai:stop` instead of
// relying on it running in the background all the time.
import { execFileSync, spawn } from "node:child_process";
import { existsSync } from "node:fs";

const action = process.argv[2];
const BASE_URL = process.env.LLM_BASE_URL?.replace(/\/v1\/?$/, "") ?? "http://localhost:11434";

// A freshly-installed Ollama isn't on PATH until the current shell/session restarts (Windows
// only refreshes PATH for new processes) — fall back to the default install location instead of
// failing with ENOENT the first time someone runs this right after installing.
function resolveOllamaBin() {
  if (process.platform !== "win32") return "ollama";
  const fallback = `${process.env.LOCALAPPDATA}\\Programs\\Ollama\\ollama.exe`;
  try {
    execFileSync("where", ["ollama"], { stdio: "ignore" });
    return "ollama";
  } catch {
    return existsSync(fallback) ? fallback : "ollama";
  }
}

function isRunning() {
  try {
    execFileSync("curl", ["-sf", "-o", process.platform === "win32" ? "NUL" : "/dev/null", "--max-time", "2", BASE_URL]);
    return true;
  } catch {
    return false;
  }
}

function start() {
  if (isRunning()) {
    console.log("Ollama já está rodando em " + BASE_URL + ".");
    return;
  }
  const bin = resolveOllamaBin();
  const child = spawn(bin, ["serve"], { detached: true, stdio: "ignore" });
  child.on("error", (err) => {
    console.error(`Não consegui iniciar o Ollama (${bin}): ${err.message}`);
    console.error("Se acabou de instalar, feche e reabra o terminal (PATH precisa atualizar) e tente de novo.");
    process.exit(1);
  });
  child.unref();
  console.log(`Ollama iniciado em segundo plano (PID ${child.pid}). Modelo carrega sob demanda na primeira chamada.`);
}

function tryKill(cmd, args) {
  try {
    execFileSync(cmd, args, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function stop() {
  let killedAny = false;
  if (process.platform === "win32") {
    // Two separate processes on Windows — the server and the tray app, if present.
    killedAny = tryKill("taskkill", ["/IM", "ollama.exe", "/F"]) || killedAny;
    killedAny = tryKill("taskkill", ["/IM", "ollama app.exe", "/F"]) || killedAny;
  } else {
    killedAny = tryKill("pkill", ["-f", "ollama serve"]);
  }
  console.log(killedAny ? "Ollama parado — memória liberada." : "Ollama não estava rodando (ou já foi encerrado).");
}

if (action === "start") start();
else if (action === "stop") stop();
else {
  console.error("Uso: node scripts/ollama-ctl.mjs start|stop");
  process.exit(1);
}
