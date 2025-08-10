import { memo, useEffect, useRef, useState } from 'react';
import { useWarpStore } from '../../store/warpSlice';
import { useTimerStore } from '../../store/timerSlice';
import {
  WARP_MODE,
  WARP_ANIMATION,
  CSS_CLASSES,
  ELEMENT_IDS,
  STAR_COUNTS_BY_QUALITY,
  STAR_SPEED_FACTORS_BY_QUALITY,
  STARFIELD_QUALITY,
  STARFIELD_THRESHOLDS
} from '../../constants';

// Small utilities for speed smoothing and mode control
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
type StarfieldMode = 'idle' | 'active';
const EPS = 0.001;

// Define star interface for type safety
interface Star {
  x: number;
  y: number;
  z: number;
  size?: number;
  color?: string;
  // Previous position for streaking effect
  prevX?: number;
  prevY?: number;
}

// Temporary debug flag to visualize speed and gating. Disabled for production.
const DEBUG_STARFIELD = false;

export const StarfieldCanvas: React.FC = memo(() => {
  // Emergency minimal renderer toggle (set true to force fallback drawing)
  const EMERGENCY_FALLBACK = false;
  const isDev = import.meta.env.DEV;
  // Get state from warp store
  const {
    warpMode,
    starfieldQuality,
    effectiveSpeed,
    isThrusting,
    speedMultiplier,
    setEffectiveSpeed
  } = useWarpStore();

  // Get session state from timer store
  const { isSessionActive } = useTimerStore();

  // Refs for animation and DOM elements
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const starsRef = useRef<Star[]>([]);
  const animationFrameIdRef = useRef<number | null>(null);
  const lastTsRef = useRef<number>(0);
  // Keep latest effectiveSpeed available to rAF without React re-render
  const effectiveSpeedRef = useRef<number>(effectiveSpeed);
  // Fallback renderer refs/state (self-contained and removable)
  const fbCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const fbRafRef = useRef<number | null>(null);
  const fbStarsRef = useRef<Array<{ x: number; y: number; size: number; speed: number }>>([]);
  const fbSizeRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 });
  const fbDprRef = useRef<number>(1);
  
  // Finite state + smoothing references
  const currentSpeedRef = useRef<number>(effectiveSpeed);
  const targetSpeedRef = useRef<number>(WARP_ANIMATION.IDLE_SPEED_FACTOR);
  const modeRef = useRef<StarfieldMode>('idle');
  // Throttled store sync
  const lastStoreSyncRef = useRef<number>(0);
  const prevSyncedSpeedRef = useRef<number>(effectiveSpeed);

  // Local state for canvas dimensions
  const [dimensions, setDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });

  // Initialize stars based on quality and mode
  const initStars = () => {
    if (starfieldQuality === STARFIELD_QUALITY.OFF) {
      starsRef.current = [];
      return;
    }

    // Use appropriate star count based on mode
    const count = warpMode === WARP_MODE.FULL 
      ? STAR_COUNTS_BY_QUALITY[starfieldQuality]
      : WARP_ANIMATION.STAR_COUNT_BG;

    const stars: Star[] = [];

    for (let i = 0; i < count; i++) {
      const x = Math.random() * window.innerWidth * 2 - window.innerWidth;
      const y = Math.random() * window.innerHeight * 2 - window.innerHeight;
      const z = Math.random() * WARP_ANIMATION.MAX_DEPTH;
      
      // Increase brightness of stars in background mode
      const brightness = warpMode === WARP_MODE.BACKGROUND 
        ? Math.floor(Math.random() * 25) + 230  // Brighter for background mode (230-255)
        : Math.floor(Math.random() * 55) + 200; // Normal for full mode (200-255)
      
      stars.push({
        x,
        y,
        z,
        prevX: x,
        prevY: y,
        size: Math.random() * 1.5 + (warpMode === WARP_MODE.BACKGROUND ? 1.0 : 0.5), // Larger stars in background mode
        color: `rgba(${brightness}, ${brightness}, ${Math.min(brightness + 30, 255)}, 1)` // Slightly bluer white
      });
    }

    starsRef.current = stars;
  };

  // Handle window resize
  const handleResize = () => {
    if (canvasRef.current) {
      canvasRef.current.width = window.innerWidth;
      canvasRef.current.height = window.innerHeight;
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      });
    }
  };

  // Emergency fallback: simple white dots falling animation
  useEffect(() => {
    if (!EMERGENCY_FALLBACK) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const setupSize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      fbDprRef.current = dpr;
      const w = window.innerWidth;
      const h = window.innerHeight;
      fbSizeRef.current = { w, h };
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      fbCtxRef.current = ctx;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr); // draw in CSS pixels
    };

    const seedStars = (w: number, h: number) => {
      const stars: Array<{ x: number; y: number; size: number; speed: number }> = [];
      for (let i = 0; i < 200; i++) {
        stars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          size: Math.random() * 1.4 + 0.6,
          speed: Math.random() * 0.8 + 0.4,
        });
      }
      fbStarsRef.current = stars;
    };

    setupSize();
    seedStars(fbSizeRef.current.w, fbSizeRef.current.h);

    const animate = () => {
      const ctx = fbCtxRef.current;
      const { w, h } = fbSizeRef.current;
      if (!ctx) {
        fbRafRef.current = requestAnimationFrame(animate);
        return;
      }
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, w, h);

      ctx.fillStyle = 'white';
      const stars = fbStarsRef.current;
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
        s.y += s.speed;
        if (s.y > h) s.y = 0; // wrap to top
      }
      fbRafRef.current = requestAnimationFrame(animate);
    };

    const onResize = () => {
      setupSize();
      // keep stars; size-only change is fine
    };

    window.addEventListener('resize', onResize);
    fbRafRef.current = requestAnimationFrame(animate);

    return () => {
      if (fbRafRef.current) {
        cancelAnimationFrame(fbRafRef.current);
        fbRafRef.current = null;
      }
      window.removeEventListener('resize', onResize);
    };
  }, []);

  // Animation function
  const animateStars = (timestamp: number) => {
    if (!canvasRef.current) {
      return;
    }

    // Compute dt in seconds (clamped) and store last timestamp
    const last = lastTsRef.current || timestamp;
    const dt = Math.min(0.05, Math.max(0, (timestamp - last) / 1000));
    lastTsRef.current = timestamp;

    // Smoothly ease local effectiveSpeed toward target each frame (cubic ease, framerate-independent)
    {
      const cur = currentSpeedRef.current;
      const tgt = targetSpeedRef.current;
      const k = 12; // ~12Hz easing
      const t = Math.min(1, dt * k);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      const next = lerp(cur, tgt, eased);
      const snapped =
        Math.abs(next - tgt) < EPS ? tgt :
        Math.abs(next) < EPS ? 0 : next;
      currentSpeedRef.current = snapped;
      effectiveSpeedRef.current = snapped;
      // Throttle store sync to avoid re-render storms
      const shouldSync =
        (timestamp - lastStoreSyncRef.current > 120) &&
        Math.abs(prevSyncedSpeedRef.current - snapped) > 0.02;
      if (shouldSync) {
        try { setEffectiveSpeed(snapped); } catch {}
        prevSyncedSpeedRef.current = snapped;
        lastStoreSyncRef.current = timestamp;
      }
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas with a solid black background for better edge behavior
    ctx.fillStyle = 'rgb(0, 0, 0)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Calculate speed based on quality and current state
    const baseSpeedFactor = STAR_SPEED_FACTORS_BY_QUALITY[starfieldQuality];
    const eff = effectiveSpeedRef.current ?? effectiveSpeed;
    
    // Use effectiveSpeed from the store which handles:
    // - Idle speed when no session is active (subtle drift with IDLE_SPEED_FACTOR)
    // - Thrust speed during thrust effect
    // - Smooth transition after thrust
    const renderSpeed = Math.min(
      eff * baseSpeedFactor,
      WARP_ANIMATION.MAX_EFFECTIVE_SPEED
    );

    // Check if we are in idle mode (not static anymore, but very slow drift)
    const isIdleMode = !isSessionActive && warpMode === WARP_MODE.BACKGROUND;
    
    // Determine modes using effectiveSpeed against normalized thresholds
    const isWarp = eff >= STARFIELD_THRESHOLDS.WARP;
    const isHyperspace = eff >= STARFIELD_THRESHOLDS.HYPERSPACE;
    const isUltraSpeed = eff >= STARFIELD_THRESHOLDS.HYPERSPACE * 1.5;

    // Visual tuning factors derived from gating
    const stretchFactor = isHyperspace ? 2.0 : isWarp ? 1.4 : 1.0;

    // Update and draw stars
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    starsRef.current.forEach((star) => {
      // For idle stars, ensure prevX/Y are properly tracked but with minimal movement
      if (isIdleMode) {
        // Save previous position for minimal streaking effect
        star.prevX = star.x * (WARP_ANIMATION.MAX_DEPTH / (star.z || 1)) + centerX;
        star.prevY = star.y * (WARP_ANIMATION.MAX_DEPTH / (star.z || 1)) + centerY;
        
        // Move star closer to viewer with the idle speed factor (make idle a bit more noticeable)
        star.z -= 0.6 * renderSpeed * (dt * 60);
      } else {
        // For moving stars, store previous position for streaking
        star.prevX = star.x * (WARP_ANIMATION.MAX_DEPTH / (star.z || 1)) + centerX;
        star.prevY = star.y * (WARP_ANIMATION.MAX_DEPTH / (star.z || 1)) + centerY;

        // Move star closer to viewer (much faster with renderSpeed for strong hyperspace)
        star.z -= 2.5 * renderSpeed * (dt * 60);
      }

      // Reset star when it gets too close
      if (star.z <= 0) {
        star.z = WARP_ANIMATION.MAX_DEPTH;
        star.x = Math.random() * canvas.width * 2 - canvas.width;
        star.y = Math.random() * canvas.height * 2 - canvas.height;
        // Reset previous position to avoid streaking from old position
        star.prevX = star.x;
        star.prevY = star.y;
      }

      // Project star position to 2D
      const factor = WARP_ANIMATION.MAX_DEPTH / (star.z || 1);
      const starX = star.x * factor + centerX;
      const starY = star.y * factor + centerY;

      // Only draw stars within canvas bounds
      if (starX >= 0 && starX <= canvas.width && starY >= 0 && starY <= canvas.height) {
        // Calculate size and color based on z-position
        const sizeFactor = 1 - star.z / WARP_ANIMATION.MAX_DEPTH;
        const size = (star.size || 1) * sizeFactor * 5;
        const alpha = sizeFactor;
        
        // Determine if we should draw a streak based on speed
        // For idle mode, we can have very subtle streaks
        let shouldStreak;
        if (isIdleMode) {
          // In idle mode, only show subtle streaks occasionally for stars that are closer
          shouldStreak = star.z < WARP_ANIMATION.MAX_DEPTH * 0.3 && renderSpeed > 0;
        } else {
          // Normal streak logic for active sessions
          shouldStreak = renderSpeed >= WARP_ANIMATION.MIN_SPEED_FOR_STREAKS;
        }
        
        if (shouldStreak && star.prevX !== undefined && star.prevY !== undefined) {
          // Calculate streak length based on speed and star's z-position using enhanced formula
          // Speed ratio is proportional to how much over the min streak speed we are
          const speedRatio = Math.max(0, (renderSpeed - WARP_ANIMATION.MIN_SPEED_FOR_STREAKS) / WARP_ANIMATION.MIN_SPEED_FOR_STREAKS);
          
          // Enhanced streak length calculation:
          // - Base length + additional length proportional to speed
          // - Use new constants for more control and more dramatic results at high speeds
          const depthFactor = Math.pow(1 - star.z / WARP_ANIMATION.MAX_DEPTH, 1.8); // Enhanced depth factor
          const streakLength = (WARP_ANIMATION.STREAK_BASE_LENGTH + 
            (speedRatio * WARP_ANIMATION.STREAK_LENGTH_FACTOR * depthFactor)) * stretchFactor;
          
          // Cap at max streak length - increased for more dramatic effect at high speeds
          const maxLength = Math.min(WARP_ANIMATION.MAX_STREAK_LENGTH, streakLength);
          
          // Calculate streak vector
          const dx = starX - star.prevX;
          const dy = starY - star.prevY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          // Only draw streak if there's movement - reduced threshold to draw more streaks
          if (distance > 0.2) {
            // Normalize and scale the vector
            const length = Math.min(distance, maxLength);
            const nx = dx / distance;
            const ny = dy / distance;
            
            // Draw streak as a line
            ctx.beginPath();
            
            // Create gradient for streak
            const gradient = ctx.createLinearGradient(
              starX, starY, 
              starX - nx * length, starY - ny * length
            );
            
            // Get base color - add more blue/white tint for faster streaks
            let streakColor;
            if (isUltraSpeed) {
              // Pure blue-white for ultra-high speed effect
              streakColor = 'rgba(245, 250, 255,';
            } else if (isHyperspace) {
              // Blue-white for hyperspace effect
              streakColor = 'rgba(235, 245, 255,';
            } else if (renderSpeed > WARP_ANIMATION.MIN_SPEED_FOR_STREAKS * 2) {
              // Blueish for medium-high speeds
              streakColor = 'rgba(225, 240, 255,';
            } else {
              // Use star's color or default white for lower speeds
              streakColor = star.color ? star.color.replace(/[^,]+\)$/, '') : 'rgba(255, 255, 255,';
            }
            
            // Add gradient stops with higher opacity for more visible streaks
            // Boost alpha significantly in hyperspace mode and based on speed
            const speedBoost = Math.min(speedRatio * 0.6, 0.6); // Additional boost based on speed
            const headAlpha = isHyperspace ? 1.0 : Math.min(alpha * 2.2 + speedBoost, 1.0);
            
            // Three-stop gradient for more realistic streak effect
            gradient.addColorStop(0, `${streakColor} ${headAlpha})`); // Start of streak (brightest)
            gradient.addColorStop(0.15, `${streakColor} ${headAlpha * 0.95})`); // Near start (still bright)
            gradient.addColorStop(0.5, `${streakColor} ${headAlpha * 0.6})`); // Middle (fading)
            gradient.addColorStop(1, `${streakColor} 0)`); // End of streak (transparent)
            
            ctx.strokeStyle = gradient;
            
            // Adjust line width based on speed and hyperspace mode
            // Thinner at extreme speeds for a more streamlined look, thicker at lower speeds
            let lineWidthFactor;
            if (isUltraSpeed) {
              // Very thin lines in ultra speed for a sleek look
              lineWidthFactor = 0.35;
            } else if (isHyperspace) {
              // Very thin lines in hyperspace for a sleek look
              lineWidthFactor = 0.4;
            } else if (renderSpeed > 5) {
              // Thinner at high speeds
              lineWidthFactor = 0.6;
            } else if (renderSpeed > 3) {
              // Medium thickness at medium speeds
              lineWidthFactor = 0.8;
            } else {
              // Standard thickness at lower speeds
              lineWidthFactor = 1.0;
            }
            
            ctx.lineWidth = size * lineWidthFactor;
            ctx.lineCap = 'round';
            
            // Draw the streak line
            ctx.moveTo(starX, starY);
            ctx.lineTo(starX - nx * length, starY - ny * length);
            ctx.stroke();
          }
        }
        
        // Only draw the star point if:
        // 1. It's a static star (always draw points for static stars)
        // 2. OR it's not in hyperspace mode
        // 3. OR it's not streaking
        // This creates a cleaner, streak-dominated look at high speeds
        const shouldDrawPoint = isIdleMode || (!isUltraSpeed && (!isHyperspace || !shouldStreak));
      
        if (shouldDrawPoint) {
          ctx.beginPath();
          ctx.arc(starX, starY, size, 0, Math.PI * 2);
          
          // Use star's color if available, otherwise use white with alpha
          // For static stars, make them slightly brighter to ensure visibility
          const pointAlpha = isIdleMode ? Math.min(alpha * 1.2, 1.0) : alpha;
          ctx.fillStyle = star.color ? star.color.replace('1)', `${pointAlpha})`) : `rgba(255, 255, 255, ${pointAlpha})`;
          ctx.fill();

          // Add glow effect for larger stars in ultra quality
          if (starfieldQuality === STARFIELD_QUALITY.ULTRA && size > 2) {
            ctx.beginPath();
            ctx.arc(starX, starY, size * 2, 0, Math.PI * 2);
            ctx.fillStyle = star.color ? star.color.replace('1)', `${pointAlpha * 0.3})`) : `rgba(255, 255, 255, ${pointAlpha * 0.3})`;
            ctx.fill();
          }
        }
      }
    });

    // Toggle hyperspace CSS attribute for optional shake effects
    try {
      document.body.dataset.hyperspace = isHyperspace ? 'true' : 'false';
    } catch {}

    // Debug HUD
    if (DEBUG_STARFIELD) {
      ctx.save();
      ctx.font = '12px monospace';
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.fillText(`speed: ${eff.toFixed(2)}  warp: ${isWarp}  hyper: ${isHyperspace}`, 8, 16);
      ctx.restore();
    }

    // Request next frame
    animationFrameIdRef.current = requestAnimationFrame(animateStars);
  };

  // Apply DOM effects for warp mode
  const applyWarpModeEffects = (mode: typeof WARP_MODE[keyof typeof WARP_MODE]) => {
    // Clean up any existing effects
    document.body.classList.remove(CSS_CLASSES.BG_BLACK);
    document.body.style.overflow = '';
    
    // Remove any UI fading classes
    document.querySelectorAll(`.${CSS_CLASSES.WARP_DIMMED_TEXT}`).forEach(el => {
      el.classList.remove(CSS_CLASSES.OPACITY_70, CSS_CLASSES.WARP_DIMMED_TEXT);
    });
    document.querySelectorAll(`.${CSS_CLASSES.WARP_CONTROL_BUTTON}`).forEach(el => {
      el.classList.remove(CSS_CLASSES.OPACITY_50, CSS_CLASSES.WARP_FADED_BUTTON);
    });
    
    // Remove warp-dim class from minute input
    const minutesInput = document.getElementById(ELEMENT_IDS.MINUTES_INPUT);
    if (minutesInput) {
      minutesInput.classList.remove(CSS_CLASSES.WARP_DIM);
    }

    // Apply new effects based on mode
    if (mode === WARP_MODE.FULL) {
      document.body.classList.add(CSS_CLASSES.BG_BLACK);
      document.body.style.overflow = 'hidden';
      
      // In full mode, we may dim UI elements that should be less prominent
      document.querySelectorAll('.text-white, .dark\\:text-white, .text-gray-200, .dark\\:text-gray-200').forEach(el => {
        if (el.textContent && /[0-9]/.test(el.textContent)) {
          el.classList.add(CSS_CLASSES.OPACITY_70, CSS_CLASSES.WARP_DIMMED_TEXT);
        }
      });
    }
    // For BACKGROUND mode, we do NOT apply any dimming to UI elements
    // This ensures all UI elements retain full opacity when in background mode
  };

  // Optional debug: render info (avoid logging in render by default)
  if (false && isDev) {
    console.log(
      `Rendering StarfieldCanvas with mode: ${warpMode}, quality: ${starfieldQuality}, isSessionActive: ${isSessionActive}`
    );
  }

  // Setup and cleanup effects
  useEffect(() => {
    if (EMERGENCY_FALLBACK) return;
    if (isDev) {
      // One-time init log
      console.log('StarfieldCanvas init. mode:', warpMode, 'quality:', starfieldQuality);
    }
    
    // Initialize stars
    initStars();
    
    // Set up resize handler
    window.addEventListener('resize', handleResize);
    
    // Make sure canvas is properly sized on initialization
    handleResize();
    
    // Start animation if warp mode is active (guard to avoid duplicate loops)
    if (warpMode !== WARP_MODE.NONE && starfieldQuality !== STARFIELD_QUALITY.OFF) {
      if (animationFrameIdRef.current != null) {
        // Loop already running
      } else {
        if (isDev) console.log('Starting animation');
        animationFrameIdRef.current = requestAnimationFrame(animateStars);
      }
    }
    
    return () => {
      // Clean up animation
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
      
      // Remove resize listener
      window.removeEventListener('resize', handleResize);
      
      // Clean up DOM effects
      applyWarpModeEffects(WARP_MODE.NONE);
    };
  }, []);

  // We intentionally avoid subscribing to store effectiveSpeed to prevent feedback loops.

  // Handle changes to warp mode
  useEffect(() => {
    if (EMERGENCY_FALLBACK) return;
    // Reinitialize stars with new mode
    initStars();
    
    // Apply DOM effects
    applyWarpModeEffects(warpMode);
    
    // Start or stop animation based on warp mode
    if (warpMode !== WARP_MODE.NONE && starfieldQuality !== STARFIELD_QUALITY.OFF) {
      if (animationFrameIdRef.current != null) {
        // already running
      } else {
        animationFrameIdRef.current = requestAnimationFrame(animateStars);
      }
    } else {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
    }
    
  }, [warpMode]);

  // React to session/warp preference changes to set target speed
  useEffect(() => {
    if (EMERGENCY_FALLBACK) return;
    const nextMode: StarfieldMode =
      isSessionActive && warpMode !== WARP_MODE.NONE ? 'active' : 'idle';
    if (modeRef.current !== nextMode) {
      modeRef.current = nextMode;
    }
    let target: number = WARP_ANIMATION.IDLE_SPEED_FACTOR;
    if (isThrusting) {
      target = WARP_ANIMATION.THRUST_EFFECT_SPEED;
    } else if (nextMode === 'active') {
      target = WARP_ANIMATION.DEFAULT_SESSION_SPEED * (speedMultiplier ?? 1.0);
    }
    targetSpeedRef.current = target;
  }, [isSessionActive, warpMode, speedMultiplier, isThrusting]);

  // Handle changes to starfield quality
  useEffect(() => {
    if (EMERGENCY_FALLBACK) return;
    // Re-initialize stars with new quality
    initStars();
    
    // Start or stop animation based on quality
    if (starfieldQuality !== STARFIELD_QUALITY.OFF && warpMode !== WARP_MODE.NONE) {
      if (animationFrameIdRef.current != null) {
        // already running
      } else {
        animationFrameIdRef.current = requestAnimationFrame(animateStars);
      }
    } else {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
    }
  }, [starfieldQuality]);
  
  // Handle changes to session state or effective speed
  useEffect(() => {
    if (EMERGENCY_FALLBACK) return;
    // Start animation if it should be running (guarded)
    if (warpMode !== WARP_MODE.NONE && starfieldQuality !== STARFIELD_QUALITY.OFF) {
      if (animationFrameIdRef.current == null) {
        if (isDev) {
          console.log(
            'Starting animation due to session/effectiveSpeed change:',
            isSessionActive,
            effectiveSpeed
          );
        }
        animationFrameIdRef.current = requestAnimationFrame(animateStars);
      }
    } else {
      // Cancel any existing animation frame
      if (animationFrameIdRef.current != null) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
    }
  }, [isSessionActive, warpMode, starfieldQuality, isThrusting, dimensions]);

  // Render: fallback canvas or original one
  if (EMERGENCY_FALLBACK) {
    return (
      <canvas
        ref={canvasRef}
        className="starfield-canvas fixed inset-0 pointer-events-none"
        style={{ backgroundColor: 'black', zIndex: 1 }}
      />
    );
  }

  // Original rendering path (kept intact, not used during fallback)
  if (warpMode === WARP_MODE.NONE || starfieldQuality === STARFIELD_QUALITY.OFF) {
    return null;
  }

  const canvasStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    zIndex: 1,
    pointerEvents: 'none',
    opacity: 1,
    backgroundColor: 'black',
    transition: 'opacity 0.3s ease-in-out',
  };
  if (warpMode === WARP_MODE.FULL) {
    canvasStyle.zIndex = 9999;
  }
  return (
    <canvas
      ref={canvasRef}
      id={warpMode === WARP_MODE.FULL ? ELEMENT_IDS.WARP_FULL : ELEMENT_IDS.WARP_BG}
      width={dimensions.width}
      height={dimensions.height}
      style={canvasStyle}
      className="starfield-canvas"
      data-warp-mode={warpMode}
      data-quality={starfieldQuality}
    />
  );
});