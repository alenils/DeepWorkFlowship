import { useEffect, useRef, useState } from "react";

export function useFortyHz(url = "/sounds/focus-40hz.mp3.mp3") {
  const ctxRef = useRef<AudioContext | null>(null);
  const srcRef = useRef<AudioBufferSourceNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const bufferRef = useRef<AudioBuffer | null>(null);
  const loadingRef = useRef<Promise<AudioBuffer> | null>(null);
  const [isOn, setIsOn] = useState(false);
  const volume = 0.35; // slightly louder per user feedback, still conservative

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      try { srcRef.current?.stop(); } catch {}
      try { srcRef.current?.disconnect(); } catch {}
      // Intentionally keep context/gain for potential reuse across mounts
    };
  }, []);

  async function ensureContext() {
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
  }

  async function start() {
    try {
      await ensureContext();
      const ctx = ctxRef.current!;

      // Decode once and cache
      if (!bufferRef.current) {
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
      }

      const src = ctx.createBufferSource();
      src.buffer = bufferRef.current;
      src.loop = true;
      src.connect(gainRef.current!);
      src.start(0);
      srcRef.current = src;

      setIsOn(true);
      console.log('[40Hz] Started overlay');
    } catch (err) {
      console.error('[40Hz] Error starting overlay', err);
    }
  }

  function stop() {
    try { srcRef.current?.stop(); } catch {}
    try { srcRef.current?.disconnect(); } catch {}
    srcRef.current = null;
    setIsOn(false);
    console.log('[40Hz] Stopped overlay');
  }

  function toggle() { isOn ? stop() : start(); }

  return { isOn, start, stop, toggle };
}
