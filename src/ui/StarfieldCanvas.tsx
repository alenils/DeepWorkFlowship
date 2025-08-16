import React, { useEffect, useMemo, useRef } from 'react';

// Simple, single-canvas starfield with two visual modes: "spacex" and "light"
// - Fullscreen fixed canvas positioned behind the UI
// - DPR clamped to 1.5 for perf
// - Adaptive star density based on viewport area
// - Animation pauses when document hidden or canvas is offscreen
// - Cleans up observers and RAF on unmount

export type StarfieldMode = 'off' | 'spacex' | 'light';

interface StarfieldCanvasProps {
  mode: StarfieldMode;
  // Speed is a free-form numeric value sourced from the warp store's effectiveSpeed.
  // Typical ranges: 0 (idle/off), ~0.05 (idle drift), ~8 (session), up to ~25 (thrust).
  speed: number;
  // If true, raise canvas above UI (z-index 9999) to act as an overlay
  overlay?: boolean;
}

interface Star {
  x: number;
  y: number;
  z: number; // 0..1 depth (1 is far, 0 is near)
  angle?: number; // for light mode radial motion
  radius?: number; // for light mode radial distance
  size: number; // base size in screen px
  alpha: number; // 0..1 brightness
}

const DPR_MAX = 1.5;
const CLEAR_ALPHA = 0.9; // motion trails by not fully clearing

export const StarfieldCanvas: React.FC<StarfieldCanvasProps> = ({ mode, speed, overlay = false }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const dprRef = useRef(1);
  const rafRef = useRef<number | null>(null);
  const runningRef = useRef(false);
  const visibleRef = useRef(true);
  const lastTsRef = useRef<number>(0);

  const starsRef = useRef<Star[]>([]);
  const starTargetRef = useRef<number>(0);

  // Cache center for light mode
  const centerRef = useRef({ x: 0, y: 0 });
  // Overlay z-index flag
  const overlayRef = useRef<boolean>(!!overlay);

  // Compute initial target star count based on viewport area
  const initialTarget = useMemo(() => {
    const w = window.innerWidth;
    const h = Math.max(window.innerHeight, document.documentElement?.scrollHeight || window.innerHeight);
    const area = w * h;
    // ~0.00022 stars per pixel, clamped
    return Math.max(180, Math.min(900, Math.round(area * 0.00022)));
  }, []);

  // Normalize an open-ended speed into 0..1 scale for visuals
  const normalizedSpeed = useMemo(() => {
    // Map: 0 -> 0, 8 -> ~0.6, 25 -> 1.0
    const s = Math.max(0, speed);
    const ns = s / 25;
    return Math.max(0, Math.min(1, ns));
  }, [speed]);

  // Resize canvas to viewport/document height with DPR
  const resizeCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(DPR_MAX, window.devicePixelRatio || 1);
    dprRef.current = dpr;

    const w = Math.max(1, Math.floor(window.innerWidth));
    const docH = Math.max(
      window.innerHeight,
      document.documentElement?.scrollHeight || 0,
      document.body?.scrollHeight || 0
    );
    const h = Math.max(1, Math.floor(docH));

    canvas.style.position = 'fixed';
    canvas.style.inset = '0px';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = overlayRef.current ? '9999' : '1'; // overlay above UI when requested

    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctxRef.current = ctx;
      // Scale context for DPR
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    // Update center point for light mode
    centerRef.current = { x: w / 2, y: Math.min(h, window.innerHeight) / 2 };

    // Update star target count
    const area = w * h;
    starTargetRef.current = Math.max(180, Math.min(900, Math.round(area * 0.00022)));
  };

  // Initialize a single star
  const makeStar = (w: number, h: number, modeKey: StarfieldMode): Star => {
    const z = Math.random();
    const alpha = 0.35 + (1 - z) * 0.65; // nearer -> brighter
    const size = 0.6 + (1 - z) * 1.8;

    if (modeKey === 'light') {
      const angle = Math.random() * Math.PI * 2;
      const radius = (Math.random() ** 2) * Math.min(w, h) * 0.45; // bias toward center
      const cx = centerRef.current.x;
      const cy = centerRef.current.y;
      return {
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius,
        z,
        angle,
        radius,
        size,
        alpha,
      };
    }

    // spacex/off placement: spread beyond edges for seamless wrap
    return {
      x: -100 + Math.random() * (w + 200),
      y: -100 + Math.random() * (h + 200),
      z,
      size,
      alpha,
    } as Star;
  };

  const ensureStarCount = (w: number, h: number, modeKey: StarfieldMode) => {
    const stars = starsRef.current;
    const target = starTargetRef.current || initialTarget;

    // Grow
    while (stars.length < target) stars.push(makeStar(w, h, modeKey));
    // Shrink
    if (stars.length > target) stars.splice(target);
  };

  const clearCanvas = (w: number, h: number) => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = `rgba(0, 0, 0, ${CLEAR_ALPHA})`; // trail fade
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  };

  const drawSpacex = (dt: number, w: number, h: number) => {
    const ctx = ctxRef.current;
    if (!ctx) return;

    const ns = normalizedSpeed; // 0..1
    const baseSpeed = 25 + 320 * ns; // px/s

    for (let i = 0; i < starsRef.current.length; i++) {
      const s = starsRef.current[i];

      // Parallax: nearer stars move faster
      const depthFactor = 0.35 + (1 - s.z) * 1.1;
      const dx = -baseSpeed * depthFactor * dt;
      s.x += dx;

      // Wrap around
      if (s.x < -120) {
        s.x = w + 120;
        s.y = -100 + Math.random() * (h + 200);
        s.z = Math.random();
        s.size = 0.6 + (1 - s.z) * 1.8;
        s.alpha = 0.35 + (1 - s.z) * 0.65;
      }

      // Draw as compact point (with slight streak as speed increases)
      const streakLen = 1 + ns * 4 * (1 - s.z);
      ctx.beginPath();
      ctx.strokeStyle = `rgba(255,255,255,${0.3 + s.alpha * 0.7})`;
      ctx.lineWidth = Math.max(0.6, s.size * (0.6 + ns * 0.8));
      ctx.moveTo(s.x + streakLen, s.y);
      ctx.lineTo(s.x, s.y);
      ctx.stroke();
    }
  };

  const drawLight = (dt: number, w: number, h: number) => {
    const ctx = ctxRef.current;
    if (!ctx) return;

    const cx = centerRef.current.x;
    const cy = centerRef.current.y;

    const ns = normalizedSpeed;
    const radialSpeed = 80 + 1400 * ns; // px/s
    const streakLen = 8 + 260 * ns; // px

    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    for (let i = 0; i < starsRef.current.length; i++) {
      const s = starsRef.current[i];
      if (s.angle === undefined || s.radius === undefined) {
        // Convert spacex star to light star on-the-fly
        s.angle = Math.random() * Math.PI * 2;
        const dx = s.x - cx;
        const dy = s.y - cy;
        s.radius = Math.sqrt(dx * dx + dy * dy);
      }

      s.radius += radialSpeed * (0.6 + (1 - s.z) * 0.7) * dt;

      // Respawn near center when offscreen
      const maxR = Math.hypot(Math.max(cx, w - cx), Math.max(cy, h - cy)) + 120;
      if (s.radius > maxR) {
        s.angle = Math.random() * Math.PI * 2;
        s.radius = (Math.random() ** 2) * Math.min(w, h) * 0.12;
        s.z = Math.random();
        s.size = 0.6 + (1 - s.z) * 1.8;
        s.alpha = 0.45 + (1 - s.z) * 0.55;
      }

      const dirX = Math.cos(s.angle);
      const dirY = Math.sin(s.angle);
      const x = cx + dirX * s.radius;
      const y = cy + dirY * s.radius;

      // Streak from tail to head
      const tx = x - dirX * streakLen * (0.6 + (1 - s.z) * 0.7);
      const ty = y - dirY * streakLen * (0.6 + (1 - s.z) * 0.7);

      ctx.beginPath();
      ctx.strokeStyle = `rgba(200,210,255,${0.25 + s.alpha * (0.5 + ns * 0.4)})`;
      ctx.lineWidth = Math.max(0.8, s.size * (1.0 + ns * 1.2));
      ctx.moveTo(tx, ty);
      ctx.lineTo(x, y);
      ctx.stroke();
    }

    // Subtle vignette/tunnel effect for immersion
    const grad = ctx.createRadialGradient(cx, cy, Math.min(w, h) * 0.06, cx, cy, Math.min(w, h) * 0.65);
    grad.addColorStop(0, `rgba(0,0,0,${0.26 + ns * 0.12})`);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.restore();
  };

  const tick = (ts: number) => {
    if (!runningRef.current) return;

    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }

    const w = canvas.clientWidth;
    const h = canvas.clientHeight;

    const last = lastTsRef.current || ts;
    const dt = Math.max(0.001, Math.min(0.05, (ts - last) / 1000)); // clamp 1ms..50ms
    lastTsRef.current = ts;

    if (!visibleRef.current || mode === 'off') {
      // Softly fade frame then stop to truly pause
      clearCanvas(w, h);
      runningRef.current = false; // stop scheduling new frames
      return;
    }

    // Maintain star population
    ensureStarCount(w, h, mode);

    // Trail fade to create motion persistence
    clearCanvas(w, h);

    // Draw one mode
    if (mode === 'light') {
      drawLight(dt, w, h);
    } else {
      drawSpacex(dt, w, h);
    }

    rafRef.current = requestAnimationFrame(tick);
  };

  const start = () => {
    if (runningRef.current) return;
    runningRef.current = true;
    lastTsRef.current = 0;
    rafRef.current = requestAnimationFrame(tick);
  };

  const stop = () => {
    runningRef.current = false;
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  // Init canvas and listeners
  useEffect(() => {
    resizeCanvas();

    const ro = new ResizeObserver(() => resizeCanvas());
    ro.observe(document.documentElement);

    const onScroll = () => resizeCanvas();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', resizeCanvas);

    // Visibility handling
    const onVisibility = () => {
      visibleRef.current = !document.hidden;
      if (visibleRef.current && !runningRef.current) start();
    };
    document.addEventListener('visibilitychange', onVisibility);

    // Intersection handling (though canvas is fixed, keep as a guard)
    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        visibleRef.current = entry.isIntersecting && !document.hidden;
        if (visibleRef.current && !runningRef.current) start();
      },
      { threshold: 0 }
    );
    if (canvasRef.current) io.observe(canvasRef.current);

    // Start anim
    start();

    return () => {
      stop();
      ro.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', resizeCanvas);
      document.removeEventListener('visibilitychange', onVisibility);
      io.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reflect overlay prop changes in style without full reinit
  useEffect(() => {
    overlayRef.current = !!overlay;
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.style.zIndex = overlayRef.current ? '9999' : '1';
    }
  }, [overlay]);

  // Reset population on mode change to preserve visual consistency
  useEffect(() => {
    const canvas = canvasRef.current;
    const w = canvas?.clientWidth || window.innerWidth;
    const h = canvas?.clientHeight || window.innerHeight;
    starsRef.current = [];
    ensureStarCount(w, h, mode);

    // If switching to off, clear and stop. If switching to active and visible, restart.
    if (mode === 'off') {
      const ctx = ctxRef.current;
      if (canvas && ctx) {
        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
        ctx.restore();
      }
      runningRef.current = false;
    } else if (visibleRef.current && !runningRef.current) {
      start();
    }
  }, [mode]);

  return <canvas ref={canvasRef} aria-hidden="true" />;
};

export default StarfieldCanvas;
