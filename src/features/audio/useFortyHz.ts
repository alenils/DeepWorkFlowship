import { useCallback, useEffect, useRef, useState } from "react";

export function useFortyHz(url = "/sounds/focus-40hz.mp3") {
  const ctxRef = useRef<AudioContext | null>(null);
  // Master/root gain into destination
  const gainRef = useRef<GainNode | null>(null);
  const bufferRef = useRef<AudioBuffer | null>(null);
  const loadingRef = useRef<Promise<AudioBuffer> | null>(null);
  // Currently playing source and its individual gain
  const currentRef = useRef<{ src: AudioBufferSourceNode; gain: GainNode; startTime: number } | null>(null);
  const scheduleIdRef = useRef<number | null>(null);
  const [isOn, setIsOn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const volume = 0.35; // slightly louder per user feedback, still conservative
  const FADE_S = 0.12;  // crossfade length in seconds (~120ms)

  // Cleanup on unmount: cancel timers and stop nodes
  useEffect(() => {
    return () => {
      if (scheduleIdRef.current !== null) {
        clearTimeout(scheduleIdRef.current);
        scheduleIdRef.current = null;
      }
      const cur = currentRef.current;
      if (cur) {
        try { cur.src.stop(); } catch {}
        try { cur.src.disconnect(); } catch {}
        try { cur.gain.disconnect(); } catch {}
      }
      currentRef.current = null;
      // Keep ctx/gain for reuse on next mount
    };
  }, []);

  const ensureContext = useCallback(async () => {
    if (!ctxRef.current) {
      const AC: typeof AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
      ctxRef.current = new AC();
    }
    if (ctxRef.current.state === "suspended") {
      await ctxRef.current.resume();
    }
    if (!gainRef.current) {
      gainRef.current = ctxRef.current.createGain();
      gainRef.current.gain.value = volume;
      gainRef.current.connect(ctxRef.current.destination);
    }
  }, []);

  const preload = useCallback(async () => {
    if (bufferRef.current) return; // already decoded
    setIsLoading(true);
    try {
      await ensureContext();
      const ctx = ctxRef.current!;
      if (!loadingRef.current) {
        loadingRef.current = (async () => {
          const resp = await fetch(url, { cache: "force-cache" });
          if (!resp.ok) {
            console.error(`[40Hz] Failed to load ${url}: ${resp.status} ${resp.statusText}`);
            throw new Error(`Failed to load 40Hz audio: ${resp.status}`);
          }
          const arr = await resp.arrayBuffer();
          return await ctx.decodeAudioData(arr);
        })();
      }
      bufferRef.current = await loadingRef.current;
    } catch (err) {
      // Clear cached promise to allow retry on next attempt
      loadingRef.current = null;
      bufferRef.current = null;
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [ensureContext, url]);

  const start = useCallback(async () => {
    try {
      await ensureContext();
      const ctx = ctxRef.current!;

      // Decode once and cache
      if (!bufferRef.current) {
        await preload();
      }

      // Create first instance (full volume)
      const first = ctx.createBufferSource();
      first.buffer = bufferRef.current;
      first.loop = false; // we'll schedule our own loop with crossfade
      const perGain = ctx.createGain();
      perGain.gain.setValueAtTime(1, ctx.currentTime);
      first.connect(perGain);
      perGain.connect(gainRef.current!);
      const startTime = ctx.currentTime;
      first.start(startTime);
      currentRef.current = { src: first, gain: perGain, startTime };

      setIsOn(true);
      console.log('[40Hz] Started overlay');

      // Schedule crossfade chain
      scheduleNext(startTime);
    } catch (err) {
      console.error('[40Hz] Error starting overlay', err);
    }
  }, [ensureContext, preload]);

  const stop = useCallback(() => {
    // cancel any scheduled crossfade
    if (scheduleIdRef.current !== null) {
      clearTimeout(scheduleIdRef.current);
      scheduleIdRef.current = null;
    }
    // stop and clean active nodes
    const cur = currentRef.current;
    if (cur) {
      try { cur.src.stop(); } catch {}
      try { cur.src.disconnect(); } catch {}
      try { cur.gain.disconnect(); } catch {}
    }
    currentRef.current = null;
    // keep master gain/context for reuse
    setIsOn(false);
    console.log('[40Hz] Stopped overlay');
  }, []);

  const toggle = useCallback(() => { isOn ? stop() : start(); }, [isOn, start, stop]);

  // Schedule the next instance slightly before buffer end and crossfade
  const scheduleNext = useCallback((prevStartTime: number) => {
    const ctx = ctxRef.current!;
    const buffer = bufferRef.current!;
    const nextAt = prevStartTime + buffer.duration - FADE_S;
    const delayMs = Math.max(0, (nextAt - ctx.currentTime) * 1000);
    if (scheduleIdRef.current !== null) {
      clearTimeout(scheduleIdRef.current);
    }
    scheduleIdRef.current = window.setTimeout(() => {
      if (!isOn) return; // stopped meanwhile
      const now = ctx.currentTime;
      const cur = currentRef.current;
      if (!cur) return;
      // Create next source at 0 gain
      const nextSrc = ctx.createBufferSource();
      nextSrc.buffer = buffer;
      nextSrc.loop = false;
      const nextGain = ctx.createGain();
      nextGain.gain.setValueAtTime(0, now);
      nextSrc.connect(nextGain);
      nextGain.connect(gainRef.current!);
      nextSrc.start(now);

      // Crossfade
      const fadeEnd = now + FADE_S;
      cur.gain.gain.cancelScheduledValues(now);
      cur.gain.gain.setValueAtTime(cur.gain.gain.value, now);
      cur.gain.gain.linearRampToValueAtTime(0, fadeEnd);

      nextGain.gain.cancelScheduledValues(now);
      nextGain.gain.setValueAtTime(0, now);
      nextGain.gain.linearRampToValueAtTime(1, fadeEnd);

      // Stop the previous source a bit after fade ends
      try { cur.src.stop(fadeEnd + 0.01); } catch {}

      // Promote next to current and chain again
      currentRef.current = { src: nextSrc, gain: nextGain, startTime: now };
      scheduleNext(now);
    }, delayMs);
  }, [FADE_S, isOn]);

  return { isOn, isLoading, start, stop, toggle, preload };
}
