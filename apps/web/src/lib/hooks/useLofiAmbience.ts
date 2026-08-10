"use client";
import { useCallback, useEffect, useRef, useState } from "react";

// Procedurally generated ambient bed (warm pad chords + soft vinyl-crackle texture) via the raw
// Web Audio API — deliberately not a real produced lofi hip-hop track (no drums/samples, no
// external audio file or streamed source). That's the point: no asset to bundle, no licensing
// question, and it works fully offline. Anyone who wants an actual playlist has the Spotify embed
// option in Settings instead (see spotifyEmbed.ts) — this is just the always-available default.
const CHORD_PROGRESSION: number[][] = [
  [130.81, 164.81, 196.0, 246.94], // Cmaj7 (C3 E3 G3 B3)
  [110.0, 130.81, 164.81, 196.0], // Am7   (A2 C3 E3 G3)
  [87.31, 130.81, 174.61, 220.0], // Fmaj7 (F2 C3 F3 A3)
  [98.0, 123.47, 146.83, 196.0], // G7    (G2 B2 D3 G3)
];
const CHORD_SECONDS = 6;
const DEFAULT_VOLUME = 0.3;

export function useLofiAmbience() {
  const [playing, setPlaying] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const oscsRef = useRef<OscillatorNode[]>([]);
  const chordIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chordIndexRef = useRef(0);
  const volumeRef = useRef(DEFAULT_VOLUME);

  const stop = useCallback(() => {
    if (chordIntervalRef.current) {
      clearInterval(chordIntervalRef.current);
      chordIntervalRef.current = null;
    }
    const ctx = ctxRef.current;
    const master = masterGainRef.current;
    if (ctx && master) {
      const now = ctx.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(master.gain.value, now);
      master.gain.linearRampToValueAtTime(0, now + 0.7);
      setTimeout(() => ctx.close().catch(() => {}), 800);
    }
    ctxRef.current = null;
    masterGainRef.current = null;
    oscsRef.current = [];
    setPlaying(false);
  }, []);

  // Must be called from a real user-gesture handler (click) — browsers block AudioContext
  // autoplay otherwise. The Pomodoro start button already is one, so this is safe to call there.
  const start = useCallback(() => {
    if (ctxRef.current) return;
    const ctx = new AudioContext();
    ctxRef.current = ctx;
    if (ctx.state === "suspended") ctx.resume().catch(() => {});

    const master = ctx.createGain();
    master.gain.value = 0;
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.value = 1400;
    master.connect(lowpass);
    lowpass.connect(ctx.destination);
    masterGainRef.current = master;

    // Slow tremolo so the pad "breathes" instead of sitting at a flat volume.
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.12;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.05;
    lfo.connect(lfoGain);
    lfoGain.connect(master.gain);
    lfo.start();

    const oscs: OscillatorNode[] = CHORD_PROGRESSION[0].map((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = freq;
      osc.detune.value = (i - 1.5) * 4;
      const voiceGain = ctx.createGain();
      voiceGain.gain.value = 0.16;
      osc.connect(voiceGain);
      voiceGain.connect(master);
      osc.start();
      return osc;
    });
    oscsRef.current = oscs;

    chordIndexRef.current = 0;
    chordIntervalRef.current = setInterval(() => {
      chordIndexRef.current += 1;
      const chord = CHORD_PROGRESSION[chordIndexRef.current % CHORD_PROGRESSION.length];
      const now = ctx.currentTime;
      oscs.forEach((osc, i) => {
        osc.frequency.cancelScheduledValues(now);
        osc.frequency.setValueAtTime(osc.frequency.value, now);
        osc.frequency.linearRampToValueAtTime(chord[i], now + 1.2);
      });
    }, CHORD_SECONDS * 1000);

    // Soft vinyl-crackle texture — short looped noise buffer, high-passed and mixed in quietly.
    const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * (Math.random() < 0.02 ? 1 : 0.15);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = "highpass";
    noiseFilter.frequency.value = 2000;
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.02;
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(master);
    noise.start();

    const now = ctx.currentTime;
    master.gain.setValueAtTime(0, now);
    master.gain.linearRampToValueAtTime(volumeRef.current, now + 1.5);
    setPlaying(true);
  }, []);

  const setVolume = useCallback((v: number) => {
    volumeRef.current = v;
    const ctx = ctxRef.current;
    const master = masterGainRef.current;
    if (ctx && master) master.gain.linearRampToValueAtTime(v, ctx.currentTime + 0.3);
  }, []);

  useEffect(() => stop, [stop]);

  return { playing, start, stop, setVolume };
}
