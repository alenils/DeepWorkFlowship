import React, { useRef, useEffect, useCallback, memo } from 'react';
import { useTimerStore } from '../../store/timerSlice';
import { useWarpStore } from '../../store/warpSlice';

// Warp mode enum from central constants (avoid duplication/mismatch)
import { WARP_MODE, EXPERIMENT_LIGHT_SPEED, LIGHT_SPEED_CONFIG } from '../../constants';

// LIGHT_SPEED_EXPERIMENT: debug marker for sanity checks

// LIGHT_SPEED_EXPERIMENT: LS tuning and helpers
const LS = {
  axialOmega: 0.006,           // axial rotation (rad/s) ≤ 0.008 for near-static feel
  lineLenMult: 8.0,            // much longer than normal warp (3–4× typical)
  lineWidthMult: 1.15,         // slightly thicker
  microJitter: 0.006,          // noise amplitude factor (≤ 0.6% of radius)
  microHz: 0.8,                // jitter frequency (Hz)
  layerParallax: [0.92, 1.0, 1.06], // three depth layers scaling
  swirlHz: [0.07, 0.09, 0.11],      // gentle layer swirl freqs
  densityHz: 0.06,             // legacy breath rate (not used for lightness directly)
  headViolet: 'rgba(216,180,254,0.95)',
  tailWhite: 'rgba(255,255,255,0.08)'
};

// LIGHT_SPEED_EXPERIMENT: per-session variation configuration (resets on reload)
let lightSpeedSessionConfig: {
  swirlSpeed: number;
  swirlAmplitude: number;
  tunnelRadiusFactor: number;
  tunnelDarkness: number;
  edgeBrightness: number;
  centerBrightness: number;
  breathPeriodSec: number;      // 10–14s breathing period
  breathLightnessAmp: number;   // ±4% lightness
  twinkleActiveRatio: number;   // 1–2% active at any moment
  twinkleDurationMsMin: number; // 250ms
  twinkleDurationMsMax: number; // 400ms
} | null = null;

function getLightSpeedSessionConfig() {
  if (!lightSpeedSessionConfig) {
    const randInRange = (min: number, max: number) => min + Math.random() * (max - min);
    lightSpeedSessionConfig = {
      swirlSpeed: randInRange(...LIGHT_SPEED_CONFIG.variation.swirlSpeedRange),
      swirlAmplitude: randInRange(...LIGHT_SPEED_CONFIG.variation.swirlAmplitudeRange),
      tunnelRadiusFactor: 0.08, // center void ≈ 8% of min(view W,H)
      tunnelDarkness: 0.28,     // ~20% lighter than previous 0.35
      edgeBrightness: LIGHT_SPEED_CONFIG.edgeBrightness,
      centerBrightness: LIGHT_SPEED_CONFIG.centerBrightness,
      breathPeriodSec: randInRange(10, 14),
      breathLightnessAmp: 0.04,
      twinkleActiveRatio: 0.015, // 1.5% of streaks twinkling
      twinkleDurationMsMin: 250,
      twinkleDurationMsMax: 400,
    };
  }
  return lightSpeedSessionConfig;
}

// Types
interface Star {
  x: number;
  y: number;
  z: number;  // Depth for parallax
  vx: number; // Velocity for rotation
  vy: number;
  size: number;
  colorIndex: number;
  twinklePhase: number;
  twinkleSpeed: number;
  // LIGHT_SPEED_EXPERIMENT: per-star seeds and twinkle state (for rare twinkle + noise)
  seedA: number;
  seedB: number;
  twinkleUntil: number;     // epoch seconds when twinkle ends
  twinkleStrength: number;  // 0..1, scaled to ±12%
  // LIGHT_SPEED Frozen Drift: LS-specific params (ignored by other modes)
  lsLayer?: 0 | 1 | 2;      // 0=back,1=mid,2=hero
  lsAngle?: number;         // base angle (rad)
  lsRadius?: number;        // radius from center (px)
  lsLen?: number;           // streak length (px)
  lsThickness?: number;     // base thickness (px, pre-DPR)
  lsHue?: number;           // base hue (deg) per radius mapping
  lsDriftPeriod?: number;   // seconds for organic drift cycle (10–14)
}

interface CelestialBody {
  name: 'moon' | 'earth' | 'sun';
  angle: number;  // Current orbital position
  distance: number;  // Distance from center (camera)
  orbitSpeed: number;  // Realistic orbital speed
  radius: number;  // Visual size
  opacity: number;
  targetOpacity: number;
  scale: number;  // For warp scaling effect
  targetScale: number;
  x: number;  // 3D position
  y: number;
  z: number;
  visible: boolean;  // Whether in camera view
  warpX: number;  // Position during warp animation
  warpY: number;
  warpZ: number;
}

// ============================================================================
// TUNABLE CONSTANTS - Adjust these for different visual effects
// ============================================================================

// Layer configuration
const LAYERS = 4;                                    // Number of depth layers
const STARS_PER_LAYER = [30, 50, 75, 100];          // Stars per layer (front to back)
const LAYER_SPEED = [0.8, 0.6, 0.4, 0.2];           // Parallax speed multipliers
const LAYER_STREAK = [3.75, 3.125, 2.5, 1.875];     // Streak length multipliers in warp (+25%)

// Visual parameters
const COLOR_PALETTE = [
  '#ffffff', '#ffffff', '#ffffff', '#ffffff',        // 50% white
  '#c8e6ff', '#c8e6ff',                             // 25% pale blue  
  '#ffe8c8',                                        // 12.5% pale gold
  '#ffc8c8'                                         // 12.5% pale red
];

// Animation constants
const IDLE_SPEED = 0.2;
const CAMERA_ROT_SPEED = 0.0002;  // Camera rotation speed (slow, cinematic)
const BASE_TWINKLE = 0.15;  // Base twinkle amount

// Celestial body constants
const OPACITY_SMOOTHING = 0.03;  // Opacity transition smoothing
const WARP_SCALE_SPEED = 0.02;  // How fast planets scale during warp

// ============================================================================
// END TUNABLE CONSTANTS
// ============================================================================

export const StarfieldCanvas: React.FC = memo(() => {
  // Get session state from timer store
  const { isSessionActive } = useTimerStore();
  
  // Get warp mode, speed multiplier, quality, and LS fullscreen flag from warp store
  const { warpMode, speedMultiplier, starfieldQuality, lightSpeedFullscreen } = useWarpStore();

  // Canvas and  // State and refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animIdRef = useRef<number | null>(null);
  const isAnimatingRef = useRef(false);  // Track if animation loop is running
  
  // Animation state
  const modeRef = useRef<'idle' | 'warp'>('idle');  // current mode
  const speedRef = useRef(IDLE_SPEED);              // current speed
  const targetSpeedRef = useRef(IDLE_SPEED);        // target speed
  const cameraRotationRef = useRef(0);              // Camera rotation angle
  const starsInitializedRef = useRef(false);        // Track if stars are initialized
  const warpPhaseRef = useRef<'accelerating' | 'cruising' | 'decelerating' | 'idle'>('idle');
  // LIGHT_SPEED_EXPERIMENT: track LS mode to tweak visuals without per-frame store reads
  const isLightSpeedRef = useRef(false);
  // LIGHT_SPEED_EXPERIMENT: rotation and blending state for LS branch
  const lsRotationRef = useRef(0); // legacy/global (not used for LS drawing now)
  const lsBlendRef = useRef(0); // 0 = FULL style, 1 = LS style
  // LS per-layer rotation angles
  const lsLayerRotRef = useRef<number[]>([0,0,0]);
  // LIGHT_SPEED engage sequence state: shake -> extend -> settle
  const lsEngageRef = useRef<{ phase: 'idle'|'shake'|'extend'|'settle'; t0: number; lastActive: boolean }>({
    phase: 'idle',
    t0: 0,
    lastActive: false,
  });
  // prefers-reduced-motion
  const reduceMotionRef = useRef(false);
  const lastTimeRef = useRef<number | null>(null);
  const isFullWarpRef = useRef(false);
  
  // Layers and stars
  const layersRef = useRef<Star[][]>([]);
  
  // Celestial bodies
  const celestialBodiesRef = useRef<CelestialBody[]>([]);
  // const sessionColorRef = useRef(0);  // Not currently used

  // Keep latest quality available in animation loop without recreating callbacks
  const qualityRef = useRef(starfieldQuality);
  useEffect(() => { qualityRef.current = starfieldQuality; }, [starfieldQuality]);

  // Initialize stars with layers and properties
  const initStars = useCallback((force: boolean = false) => {
    // Only initialize if not already done or forced
    if (!force && starsInitializedRef.current && layersRef.current.length > 0) {
      return;
    }
    
    const w = Math.max(window.innerWidth, document.documentElement.scrollWidth || 0);
    const h = Math.max(
      window.innerHeight,
      document.documentElement.scrollHeight || 0,
      document.body.scrollHeight || 0,
      document.body.offsetHeight || 0
    );
    
    const makeStar = (layerIdx: number): Star => {
      // Distribute stars evenly across the canvas for non-LS paths
      const x = Math.random() * w * 1.5 - w * 0.25;  // Wider distribution for rotation
      const y = Math.random() * h;
      const z = (layerIdx + 1) * 0.3;  // Depth based on layer
      
      return {
        x,
        y,
        z,
        vx: 0,
        vy: 0,
        size: 0.5 + Math.random() * 2.5,
        colorIndex: Math.floor(Math.random() * COLOR_PALETTE.length),
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.2 + Math.random() * 0.4,
        seedA: Math.random() * 1000,
        seedB: Math.random() * 1000,
        twinkleUntil: 0,
        twinkleStrength: 0.6 + Math.random() * 0.4
      };
    };
    
    // Create layers based on mode
    const isLS = warpMode === WARP_MODE.LIGHT_SPEED && isSessionActive;
    if (isLS) {
      // LIGHT_SPEED Frozen Drift: 3 layers with specific counts by quality
      const q = starfieldQuality;
      // Target totals: Ultra 2260, Standard 950, Eco 600
      let back = 0, mid = 0, hero = 0;
      if (q === 'ultra') { back = 480; mid = 320; hero = 64; }
      else if (q === 'standard') { const t=360; back=Math.floor(t*0.52); mid=Math.floor(t*0.38); hero=t-(back+mid); }
      else if (q === 'eco') { const t=220; back=Math.floor(t*0.53); mid=Math.floor(t*0.37); hero=t-(back+mid); }
      else { back = mid = hero = 0; }

      const minDim = Math.min(w, h);
      const makeLSStar = (layer: 0|1|2): Star => {
        // angle and radius distribution (avoid center void)
        const angle = Math.random() * Math.PI * 2;
        const rNorm = Math.pow(Math.random(), 0.85); // bias outward a bit
        const radius = rNorm * (minDim * 0.5);
        const len = (0.65 + Math.random() * 0.2) * minDim; // 0.65–0.85 of min dim
        const dpr = window.devicePixelRatio || 1;
        const thicknessBase = 0.6 + (2.2 - 0.6) * rNorm; // px pre-DPR
        const thickness = thicknessBase * dpr;
        // HSL hue by radius mapping
        let hue = 195; // default
        if (rNorm < 0.25) hue = 195 + (200 - 195) * (rNorm / 0.25);
        else if (rNorm < 0.7) hue = 190 + (195 - 190) * ((rNorm - 0.25) / 0.45);
        else hue = 185 + (190 - 185) * ((rNorm - 0.7) / 0.3);
        const driftPeriod = 10 + Math.random() * 4; // 10–14s

        return {
          x: 0, y: 0, z: 0, vx: 0, vy: 0,
          size: 1, colorIndex: 0,
          twinklePhase: Math.random() * Math.PI * 2,
          twinkleSpeed: 0.2 + Math.random() * 0.4,
          seedA: Math.random() * 1000,
          seedB: Math.random() * 1000,
          twinkleUntil: 0,
          twinkleStrength: 0.6 + Math.random() * 0.4,
          lsLayer: layer,
          lsAngle: angle,
          lsRadius: radius,
          lsLen: len,
          lsThickness: thickness,
          lsHue: hue,
          lsDriftPeriod: driftPeriod,
        };
      };

      layersRef.current = [
        Array.from({ length: back }, () => makeLSStar(0)),
        Array.from({ length: mid }, () => makeLSStar(1)),
        Array.from({ length: hero }, () => makeLSStar(2)),
      ];
    } else {
      // FULL/BACKGROUND: preserve original behavior exactly
      const qualityMultiplier = starfieldQuality === 'eco' ? 0.4 :
                               starfieldQuality === 'ultra' ? 2.0 :
                               starfieldQuality === 'standard' ? 1.0 : 0;  // 'off' = 0
      layersRef.current = Array.from({ length: LAYERS }, (_, i) =>
        Array.from({ length: Math.floor(STARS_PER_LAYER[i] * qualityMultiplier) }, () => makeStar(i))
      );
    }
    
    starsInitializedRef.current = true;
  }, [starfieldQuality, warpMode, isSessionActive]);
  
  // React to quality changes - reinitialize stars
  useEffect(() => {
    if (starsInitializedRef.current) {
      initStars(true);  // Force reinitialize when quality changes
    }
  }, [starfieldQuality, initStars]);

  // Reinitialize stars when session state changes under LIGHT_SPEED so prelaunch stays regular and launch switches to LS
  useEffect(() => {
    if (warpMode === WARP_MODE.LIGHT_SPEED) {
      initStars(true);
    }
  }, [isSessionActive, warpMode, initStars]);

  // Detect prefers-reduced-motion once
  useEffect(() => {
    try {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      reduceMotionRef.current = !!mq.matches;
      const handler = () => { reduceMotionRef.current = !!mq.matches; };
      mq.addEventListener?.('change', handler);
      return () => mq.removeEventListener?.('change', handler);
    } catch {}
  }, []);
  
  // Initialize celestial bodies with realistic properties
  const initCelestialBodies = useCallback(() => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const baseDistance = Math.max(w, h);
    
    // Realistic sizes and distances (scaled for visual appeal)
    celestialBodiesRef.current = [
      {
        name: 'moon',
        angle: Math.random() * Math.PI * 2,  // Random starting position
        distance: baseDistance * 0.8,  // Closer orbit
        orbitSpeed: 0.00008,  // Much slower orbit (was too fast)
        radius: 17,  // Small moon (15% larger)
        opacity: 0,
        targetOpacity: 1,
        scale: 1,
        targetScale: 1,
        x: 0,
        y: 0,
        z: 0,
        visible: false,
        warpX: 0,  // Position during warp
        warpY: 0,
        warpZ: 0
      },
      {
        name: 'earth',
        angle: Math.random() * Math.PI * 2 + Math.PI / 3,  // Offset from moon
        distance: baseDistance * 1.5,  // Mid-distance
        orbitSpeed: 0.00005,  // Slower speed
        radius: 35,  // Earth size (15% larger)
        opacity: 0,
        targetOpacity: 1,
        scale: 1,
        targetScale: 1,
        x: 0,
        y: 0,
        z: 0,
        visible: false,
        warpX: 0,
        warpY: 0,
        warpZ: 0
      },
      {
        name: 'sun',
        angle: Math.random() * Math.PI * 2 + Math.PI * 2/3,  // Different sector
        distance: baseDistance * 2.5,  // Far distance
        orbitSpeed: 0.00002,  // Very slow (galactic orbit)
        radius: 69,  // Large sun (15% larger)
        opacity: 0,
        targetOpacity: 1,
        scale: 1,
        targetScale: 1,
        x: 0,
        y: 0,
        z: 0,
        visible: false,
        warpX: 0,
        warpY: 0,
        warpZ: 0
      }
    ];
  }, []);

  // Canvas resize handler
  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const wCss = Math.max(window.innerWidth, document.documentElement.scrollWidth || 0);
    const hCss = Math.max(window.innerHeight, document.documentElement.scrollHeight || 0, document.body.scrollHeight || 0);
    
    canvas.width = Math.floor(wCss * dpr);
    canvas.height = Math.floor(hCss * dpr);
    canvas.style.width = `${wCss}px`;
    canvas.style.height = `${hCss}px`;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    
    // Reinitialize stars on resize if needed
    if (!starsInitializedRef.current || layersRef.current.length === 0) {
      initStars();
    }
  }, [initStars]);

  // Draw celestial body with realistic appearance
  const drawCelestialBody = (ctx: CanvasRenderingContext2D, body: any, offsetX: number, offsetY: number) => {
    if (body.opacity <= 0.05) return;
    
    // Use pre-calculated screen coordinates
    const screenX = body.x + offsetX;
    const screenY = body.y + offsetY;
    const screenRadius = body.radius;
    
    ctx.save();
    // Ensure planets are fully opaque when visible (no transparency)
    ctx.globalAlpha = Math.min(1, body.opacity * 1.2);  // Boost opacity to ensure full opacity
    
    if (body.name === 'earth') {
      // Draw Earth with distinct blue oceans and green/brown continents
      const gradient = ctx.createRadialGradient(
        screenX - screenRadius * 0.3,
        screenY - screenRadius * 0.3,
        0,
        screenX,
        screenY,
        screenRadius
      );
      gradient.addColorStop(0, 'rgba(135, 206, 250, 0.9)');  // Light blue
      gradient.addColorStop(0.3, 'rgba(30, 144, 255, 0.8)');  // Ocean blue
      gradient.addColorStop(0.6, 'rgba(34, 139, 34, 0.6)');   // Forest green
      gradient.addColorStop(1, 'rgba(25, 25, 112, 0.3)');     // Deep blue edge
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(screenX, screenY, screenRadius, 0, Math.PI * 2);
      ctx.fill();
      
      // Add continent-like patches
      ctx.fillStyle = 'rgba(34, 139, 34, 0.3)';  // Green landmasses
      ctx.beginPath();
      ctx.arc(screenX - screenRadius * 0.3, screenY - screenRadius * 0.2, screenRadius * 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(screenX + screenRadius * 0.2, screenY + screenRadius * 0.3, screenRadius * 0.25, 0, Math.PI * 2);
      ctx.fill();
    } else if (body.name === 'moon') {
      // Draw Moon with craters
      const gradient = ctx.createRadialGradient(
        screenX - screenRadius * 0.3,
        screenY - screenRadius * 0.3,
        0,
        screenX,
        screenY,
        screenRadius
      );
      gradient.addColorStop(0, 'rgba(245, 245, 245, 0.9)');
      gradient.addColorStop(0.5, 'rgba(192, 192, 192, 0.7)');
      gradient.addColorStop(1, 'rgba(128, 128, 128, 0.3)');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(screenX, screenY, screenRadius, 0, Math.PI * 2);
      ctx.fill();
      
      // Add crater effects
      ctx.fillStyle = 'rgba(105, 105, 105, 0.2)';
      for (let i = 0; i < 3; i++) {
        const craterX = screenX + (Math.random() - 0.5) * screenRadius;
        const craterY = screenY + (Math.random() - 0.5) * screenRadius;
        ctx.beginPath();
        ctx.arc(craterX, craterY, screenRadius * 0.1, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (body.name === 'sun') {
      // Draw Sun with corona
      const gradient = ctx.createRadialGradient(
        screenX,
        screenY,
        0,
        screenX,
        screenY,
        screenRadius * 1.2
      );
      gradient.addColorStop(0, 'rgba(255, 255, 224, 1)');
      gradient.addColorStop(0.3, 'rgba(255, 223, 0, 0.9)');
      gradient.addColorStop(0.6, 'rgba(255, 140, 0, 0.6)');
      gradient.addColorStop(1, 'rgba(255, 69, 0, 0.1)');
      
      // Corona glow
      ctx.shadowBlur = screenRadius * 0.8;
      ctx.shadowColor = 'rgba(255, 200, 0, 0.5)';
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(screenX, screenY, screenRadius, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.restore();
  };

  // Main animation loop
  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const w = window.innerWidth;
    // Same robust height calculation for animation
    const bodyHeight = document.body.scrollHeight || 0;
    const docHeight = document.documentElement.scrollHeight || 0;
    const bodyOffsetHeight = document.body.offsetHeight || 0;
    const viewHeight = window.innerHeight || 0;
    const h = Math.max(viewHeight, bodyHeight, docHeight, bodyOffsetHeight);
    const viewportH = window.innerHeight;
    const scrollY = window.scrollY;
    const centerX = w / 2;
    const centerY = viewportH / 2 + scrollY;
    // LIGHT_SPEED_EXPERIMENT: time base for harmonic motion
    const time = performance.now() * 0.001;
    const lsActive = isLightSpeedRef.current;
    // Frame delta time (seconds)
    const nowSec = time;
    const dt = lastTimeRef.current != null ? (nowSec - lastTimeRef.current) : 1 / 60;
    lastTimeRef.current = nowSec;
    
    // Clear canvas
    ctx.clearRect(0, 0, w, h);

    // LIGHT_SPEED_EXPERIMENT: global swirl disabled for near-still radial look
    
    // Update speed with smoother easing for seamless transition
    const speedDiff = targetSpeedRef.current - speedRef.current;
    if (Math.abs(speedDiff) > 0.01) {
      // Use smoother easing for more gradual acceleration
      const easing = speedDiff > 0 ? 0.04 : 0.08; // Slower acceleration, faster deceleration
      speedRef.current += speedDiff * easing;
    } else {
      speedRef.current = targetSpeedRef.current;
    }
    
    // Update camera rotation (global), very subtle in LIGHT SPEED
    cameraRotationRef.current += CAMERA_ROT_SPEED;

    // LIGHT_SPEED_EXPERIMENT: ease blend factor toward target and advance axial rotation
    const lsTarget = lsActive ? 1 : 0;
    // ~150ms half-life (dt * 6)
    lsBlendRef.current = Math.min(1, Math.max(0, lsBlendRef.current + (lsTarget - lsBlendRef.current) * Math.min(1, dt * 6)));
    lsRotationRef.current += LS.axialOmega * dt;
    
    // Update and draw celestial bodies (behind stars)
    if (celestialBodiesRef.current.length > 0) {
      for (const body of celestialBodiesRef.current) {
        // Update orbital position in idle mode
        if (modeRef.current === 'idle') {
          body.angle += body.orbitSpeed;
        }
        
        // Calculate 3D position with camera rotation
        const camAngle = cameraRotationRef.current;
        const orbitalX = Math.cos(body.angle) * body.distance;
        const orbitalZ = Math.sin(body.angle) * body.distance;
        const orbitalY = Math.sin(body.angle * 2) * body.distance * 0.15;  // Tilted orbit for depth
        
        // Apply camera rotation (rotating around Y axis)
        const rotatedX = orbitalX * Math.cos(camAngle) - orbitalZ * Math.sin(camAngle);
        const rotatedZ = orbitalX * Math.sin(camAngle) + orbitalZ * Math.cos(camAngle);
        
        // Check if planet is in front of camera (visible)
        body.visible = rotatedZ < -100;  // Only visible when in front with some margin
        
        // Handle warp mode animations
        if (modeRef.current === 'warp') {
          if (warpPhaseRef.current === 'accelerating' && speedRef.current > 2) {
            // During warp acceleration, move planets toward viewer
            if (!body.warpX) {
              // Initialize warp position from current position
              body.warpX = rotatedX;
              body.warpY = orbitalY;
              body.warpZ = rotatedZ;
            }
            
            // Move toward camera and scale up
            body.warpZ += speedRef.current * 5;  // Fast approach
            body.targetScale = 1 + (speedRef.current / 15) * 3;  // Scale up as we approach
            
            // Fade out as planet passes camera
            if (body.warpZ > -50) {
              body.targetOpacity = 0;
            } else {
              body.targetOpacity = body.visible ? 0.8 : 0;
            }
            
            // Use warp position for rendering
            body.x = body.warpX;
            body.y = body.warpY;
            body.z = body.warpZ;
          } else if (warpPhaseRef.current === 'decelerating') {
            // Reset warp position during deceleration
            body.warpX = 0;
            body.warpY = 0;
            body.warpZ = 0;
            body.targetScale = 1;
            body.targetOpacity = 0;  // Fade back in slowly
            
            // Use orbital position
            body.x = rotatedX;
            body.y = orbitalY;
            body.z = rotatedZ;
          }
        } else {
          // Idle mode: use orbital positions
          body.x = rotatedX;
          body.y = orbitalY;
          body.z = rotatedZ;
          body.targetScale = 1;
          body.targetOpacity = body.visible ? 1 : 0;
          
          // Reset warp positions
          body.warpX = 0;
          body.warpY = 0;
          body.warpZ = 0;
        }
        
        // Calculate screen position with perspective projection
        if (body.visible || (modeRef.current === 'warp' && body.z < 0)) {
          const perspective = 800 / Math.max(50, Math.abs(body.z));
          const screenX = centerX + body.x * perspective;
          const screenY = centerY + body.y * perspective;
          const screenRadius = body.radius * body.scale * perspective;
          
          // Smoothly transition scale and opacity
          if (Math.abs(body.targetScale - body.scale) > 0.01) {
            body.scale += (body.targetScale - body.scale) * WARP_SCALE_SPEED;
          }
          if (Math.abs(body.targetOpacity - body.opacity) > 0.01) {
            body.opacity += (body.targetOpacity - body.opacity) * OPACITY_SMOOTHING;
          }
          
          // Only draw if opacity is significant
          if (body.opacity > 0.05) {
            // Store screen position for drawing
            const drawBody = {
              ...body,
              x: screenX,
              y: screenY,
              radius: screenRadius
            };
            drawCelestialBody(ctx, drawBody, 0, 0);  // Already in screen coords
          }
        }
      }
    }
    
    // LIGHT_SPEED Frozen Drift rendering branch
    if (lsActive || (lsBlendRef.current > 0.01 && modeRef.current === 'warp')) {
      const t = time; // seconds
      const TAU = Math.PI * 2;
      const cfg = getLightSpeedSessionConfig();
      const reduce = reduceMotionRef.current;
      // Breathing placeholder removed (was ±4% over 12s) — cleaned up to avoid unused locals
      const quality = qualityRef.current;
      const isEco = quality === 'eco' || quality === 'off';

      // Engage progression (shake + reveal from center to edges)
      const engage = lsEngageRef.current;
      let reveal = 1;         // 0..1 fraction of long streak revealed from center outward
      let shakeX = 0, shakeY = 0; // camera shake offsets
      if (lsActive) {
        const minDim = Math.min(w, viewportH);
        const maxShake = reduce ? 0 : minDim * 0.008; // up to ~0.8% of min dimension
        if (engage.phase === 'shake') {
          const dur = 0.55; // slower entry
          const p = Math.min(1, Math.max(0, (t - engage.t0) / dur));
          const env = Math.sin(p * Math.PI); // 0->1->0
          const amp = maxShake * env;
          shakeX = amp * Math.sin(t * 22.0);
          shakeY = amp * Math.cos(t * 17.0);
          reveal = 0.10 + 0.20 * p; // faint/short reveal during shake
          if (p >= 1) {
            engage.phase = 'extend';
            engage.t0 = t;
          }
        }
        if (engage.phase === 'extend') {
          const dur = reduce ? 1.0 : 1.6;
          const p = Math.min(1, Math.max(0, (t - engage.t0) / dur));
          const easeInOutCubic = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
          reveal = Math.min(1, 0.15 + 0.85 * easeInOutCubic);
          const amp = maxShake * 0.25 * (1 - easeInOutCubic);
          shakeX = amp * Math.sin(t * 20.0);
          shakeY = amp * Math.cos(t * 15.0);
          if (p >= 1) {
            engage.phase = 'settle';
            engage.t0 = t;
          }
        }
        if (engage.phase === 'settle') {
          reveal = 1;
          shakeX = 0;
          shakeY = 0;
        }
      }

      // Use shaken center for cohesive camera shake
      const cX_bg = centerX + shakeX;
      const cY_bg = centerY + shakeY;
      ctx.save();
      // Background: deep space gradient (no flat black)
      if (!isEco) {
        const maxR = Math.hypot(w * 0.5, viewportH * 0.5) * 1.25;
        const bg = ctx.createRadialGradient(cX_bg, cY_bg, 0, cX_bg, cY_bg, maxR);
        bg.addColorStop(0.0, '#060A18');
        bg.addColorStop(0.6, '#050516');
        bg.addColorStop(1.0, '#05060A');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, w, h);
      }

      // No radial drift; no per-layer rotation updates. Stars remain near-static.

      // Per-layer rotation (ω) with optional wobble
      const omegaBase = [0.0048, 0.0072, 0.0096];
      const layerOpacity = [0.45, 0.70, 1.0];
      const layerThicknessScale = [0.9, 1.0, 1.15];
      const omegaMult = Math.min(1.5, Math.max(0.5, speedMultiplier));
      const omegaReduce = reduce ? 0.4 : 1.0; // reduce ω by 60%
      for (let i = 0; i < 3; i++) {
        const wobble = Math.sin(t * 0.31 + (i+1)) * (reduce ? 0.0006 : 0.0014);
        lsLayerRotRef.current[i] += (omegaBase[i] * omegaMult * omegaReduce + wobble) * dt;
      }

      // Lightweight bound radius (circle approximation) to avoid per-star ray-rectangle intersection
      const boundR = Math.hypot(w, viewportH);

      // Draw back-to-front for depth consistency using current LS layer count
      for (let layerIdx = (layersRef.current.length - 1); layerIdx >= 0; layerIdx--) {
        const layer = layersRef.current[layerIdx];
        if (!layer) continue;
        const minDim = Math.min(w, viewportH);
        const coreR = 0.03 * minDim; // tiny central core
        const softR = 0.11 * minDim; // soft falloff radius (less defined than a hard hole)
        // Center adjusted by engage shake
        const cX = centerX + shakeX;
        const cY = centerY + shakeY;

        for (let i = 0; i < layer.length; i++) {
          const s = layer[i];
          if (s.lsAngle == null || s.lsRadius == null || s.lsLen == null || s.lsThickness == null) continue;
          // Position update: per-layer rotation + organic drift (no radial velocity)
          const ang = s.lsAngle + lsLayerRotRef.current[layerIdx];
          const driftAmp = (reduce ? 0.0115 * 0.7 : 0.0115) * minDim; // slightly more organic movement
          const driftT = t / (s.lsDriftPeriod || 12);
          const dn1 = Math.sin(driftT + s.seedA * 0.013);
          const dn2 = Math.sin(driftT * 0.9 + s.seedB * 0.017);
          const ox = dn1 * driftAmp * (layerIdx === 2 ? 0.9 : layerIdx === 1 ? 0.7 : 0.6);
          const oy = dn2 * driftAmp * (layerIdx === 2 ? 0.9 : layerIdx === 1 ? 0.7 : 0.6);
          const cx = cX + Math.cos(ang) * s.lsRadius + ox;
          const cy = cY + Math.sin(ang) * s.lsRadius + oy;
          const rToCenter = Math.hypot(cx - cX, cy - cY);
          const centerFalloff = Math.max(0, Math.min(1, (rToCenter - coreR) / Math.max(1, (softR - coreR))));

          // Density thinning near center: reduce strokes close to the core to avoid a dense ring and lower draw cost
          if (centerFalloff < 0.35) {
            const randB = s.seedB - Math.floor(s.seedB);
            if (randB < 0.55) continue; // ~55% culled very near center
          } else if (centerFalloff < 0.6) {
            const randB = s.seedB - Math.floor(s.seedB);
            if (randB < 0.25) continue; // ~25% culled in mid falloff
          }

          // Streak orientation: radial, full length spans from near center outward to screen edge.
          const ux = Math.cos(ang);
          const uy = Math.sin(ang);
          // Slightly thinner near the core and thicken as falloff increases
          const W = s.lsThickness * layerThicknessScale[layerIdx] * (0.85 + 0.25 * reveal) * (0.85 + 0.15 * centerFalloff);
          // Inner anchor near the very center with per-star jitter (not a perfect ring)
          const randA = s.seedA - Math.floor(s.seedA);
          const pinRad = Math.max(0.5, softR * (0.18 + 0.24 * randA));
          const pinX = cX + ux * pinRad;
          const pinY = cY + uy * pinRad;
          // Outward endpoint approximated by circle bound (cheap)
          const fullHX = cX + ux * boundR;
          const fullHY = cY + uy * boundR;
          // Reveal head grows from inner anchor toward the outward edge
          const hx = pinX + (fullHX - pinX) * reveal;
          const hy = pinY + (fullHY - pinY) * reveal;
          const tx = pinX; // tail locked near center
          const ty = pinY;

          // HSL by normalized radius with breathing and inverse vignette
          const rn = Math.min(s.lsRadius / (minDim * 0.5), 1);
          // Subtle continuous hue drift (±24–28° over ~32s) toward light violet/blue "cosmic" vibes
          const huePeriod = reduce ? 80 : 32;
          const hueAmplitude = reduce ? 8 : 26;
          const perLayerHue = (layerIdx === 2 ? 20 : layerIdx === 1 ? 12 : 0);
          const hueBase = 228; // shift center toward light blue/violet
          const hueDrift = Math.sin((t / huePeriod) * TAU) * hueAmplitude;
          const hue = hueBase + perLayerHue + hueDrift;
          const satBase = rn < 0.25 ? (60 + 5 * (rn / 0.25)) : rn < 0.7 ? (55 + 5 * ((rn - 0.25) / 0.45)) : (50 + 5 * ((rn - 0.7) / 0.3));
          const sat = Math.min(100, satBase + (reduce ? 0 : 6));
          // Breathing rate scaled by speed multiplier (0.5x–1.5x)
          const omegaMult = Math.min(1.5, Math.max(0.5, speedMultiplier));
          const breathPeriodScaled = reduce ? Infinity : (12 / omegaMult);
          const breathFactor = reduce ? 1 : (1 + 0.04 * Math.sin((t / breathPeriodScaled) * Math.PI * 2));
          const vignette = 1 + 0.08 * Math.max(0, Math.min(1, (rn - 0.7) / 0.3));
          const baseLight = rn < 0.25 ? (78 + 4 * (rn / 0.25)) : rn < 0.7 ? (72 + 6 * ((rn - 0.25) / 0.45)) : (68 + 4 * ((rn - 0.7) / 0.3));
          const lmod = Math.min(100, baseLight * breathFactor * vignette);
          const hsl = (h:number,s:number,l:number,a:number) => `hsla(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%, ${a})`;
          const coreAlpha = 0.2 + 0.8 * (centerFalloff * centerFalloff);
          const layerAlpha = layerOpacity[layerIdx] * (0.85 + 0.15 * reveal) * coreAlpha;
          const stroke = hsl(hue, sat, lmod, layerAlpha);
          ctx.strokeStyle = stroke;
          ctx.lineCap = 'round';
          ctx.lineWidth = W;
          ctx.globalAlpha = 1;
          ctx.beginPath();
          ctx.moveTo(tx, ty);
          ctx.lineTo(hx, hy);
          ctx.stroke();
          // Halo removed for performance
        }
      }

      ctx.restore();

      // Center core: smaller, less-defined darkening with wide feather
      if (!isEco) {
        const minDim = Math.min(w, viewportH);
        const coreR = 0.035 * minDim;
        const feather = 0.12 * minDim;
        const g = ctx.createRadialGradient(cX_bg, cY_bg, 0, cX_bg, cY_bg, coreR + feather);
        const dark = Math.max(0, Math.min(1, cfg.tunnelDarkness * 0.6));
        g.addColorStop(0.0, `rgba(0,0,0,${dark})`);
        g.addColorStop(0.35, `rgba(0,0,0,${dark * 0.65})`);
        g.addColorStop(1.0, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      }

      // Inverse vignette removed for performance

      // Continue animation and early return to avoid FULL logic
      if (isAnimatingRef.current) {
        animIdRef.current = requestAnimationFrame(animate);
      }
      return;
    }

    // Draw stars by layer (back to front for proper depth)
    for (let layerIdx = LAYERS - 1; layerIdx >= 0; layerIdx--) {
      const layer = layersRef.current[layerIdx];
      if (!layer) continue;
      
      const layerSpeed = LAYER_SPEED[layerIdx];
      const layerStreak = LAYER_STREAK[layerIdx];
      
      for (const star of layer) {
        // Update star position
        if (modeRef.current === 'warp' && speedRef.current > 0) {
          // Warp mode (FULL): move stars radially outward from center to simulate forward motion through a tunnel
          const dx = star.x - centerX;
          const dy = star.y - centerY;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance > 0) {
            // Add perspective factor so outer stars drift faster, enhancing tunnel feel
            const perspectiveFactor = 1 + (distance / (w * 0.5));
            const moveX = (dx / distance) * speedRef.current * layerSpeed * perspectiveFactor;
            const moveY = (dy / distance) * speedRef.current * layerSpeed * perspectiveFactor;
            star.x += moveX;
            star.y += moveY;
          }
          
          // When a star leaves the viewport, respawn it near the center ring for continuous outward flow
          if (star.x < -150 || star.x > w + 150 || star.y < -150 || star.y > h + 150) {
            const angle = Math.random() * Math.PI * 2;
            const radiusMin = 0;
            const radiusMax = Math.min(w, viewportH) * 0.25;
            const radius = radiusMin + Math.random() * (radiusMax - radiusMin);
            star.x = centerX + Math.cos(angle) * radius;
            star.y = centerY + Math.sin(angle) * radius;
          }
        } else {
          // Idle mode: subtle rotation based on depth
          const rotSpeed = CAMERA_ROT_SPEED * star.z;  // Parallax based on depth
          
          // Calculate rotation around center (matching camera rotation)
          const dx = star.x - centerX;
          const dy = star.y - centerY;
          const angle = Math.atan2(dy, dx);
          const radius = Math.sqrt(dx * dx + dy * dy);
          
          // Apply rotation
          const newAngle = angle + rotSpeed;
          star.x = centerX + Math.cos(newAngle) * radius;
          star.y = centerY + Math.sin(newAngle) * radius;
          
          // Wrap stars horizontally for continuous effect
          if (star.x < -50) star.x = w + 50;
          if (star.x > w + 50) star.x = -50;
        }
        
        // Calculate twinkle
        let brightness = 1.0;
        star.twinklePhase += star.twinkleSpeed * 0.1;
        brightness = 1.0 - BASE_TWINKLE * 0.5 * (1 + Math.sin(star.twinklePhase));
        
        // Draw star
        ctx.save();
        ctx.globalAlpha = brightness;
        ctx.fillStyle = COLOR_PALETTE[star.colorIndex];
        
        // Check if we should skip drawing due to central void
        const dx = star.x - centerX;
        const dy = star.y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Apply void during work sessions (both idle and warp)
        if (isSessionActive) {
          const baseVoidRadius = 40;  // Base void size during sessions
          const voidRadius = baseVoidRadius + (speedRef.current * 3) * (lsActive ? 1.15 : 1);  // Slightly larger in LIGHT_SPEED
          if (distance < voidRadius) {
            ctx.restore();
            continue;  // Don't draw stars in the void area
          }
        }
        
        if (speedRef.current > 1) {
          // Draw streak in warp mode with improved forward motion
          
          const perspectiveFactor = 1 + (distance / (w * 0.5));
          const streakLength = speedRef.current * layerStreak * 3.3 * perspectiveFactor; // longer for cinematic tunnel
          
          if (distance > 0) {
            // For outward motion, the tail should extend toward the center (behind the star)
            const streakX = -(dx / distance) * streakLength;
            const streakY = -(dy / distance) * streakLength;
            
            const gradient = ctx.createLinearGradient(
              star.x, star.y,
              star.x + streakX, star.y + streakY
            );
            // LIGHT_SPEED_EXPERIMENT: violet accent at streak head
            const headColor = lsActive ? '#d8b4fe' : COLOR_PALETTE[star.colorIndex];
            gradient.addColorStop(0, headColor);
            gradient.addColorStop(1, 'transparent');
            
            ctx.strokeStyle = gradient;
            ctx.lineWidth = star.size * (lsActive ? 1.35 : 1.15);  // thicker in LIGHT_SPEED
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(star.x, star.y);
            ctx.lineTo(star.x + streakX, star.y + streakY);
            ctx.stroke();
          }
        } else {
          // Draw point in idle mode
          const distance = Math.sqrt(dx * dx + dy * dy);
          const voidRadius = speedRef.current > 0.5 ? (speedRef.current * 3) : 0;
          
          if (distance >= voidRadius) {
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        
        ctx.restore();
      }
    }
    
    // No need for overlay - void is created by not drawing stars in that area
    // FULL warp: add a subtle inverted vignette (dark tunnel center) to reinforce depth
    if (modeRef.current === 'warp' && !lsActive && isFullWarpRef.current) {
      const tunnelRadius = Math.min(w, viewportH) * 0.22;
      const tunnelGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, tunnelRadius);
      tunnelGrad.addColorStop(0.0, 'rgba(0,0,0,0.55)');
      tunnelGrad.addColorStop(0.6, 'rgba(0,0,0,0.25)');
      tunnelGrad.addColorStop(1.0, 'rgba(0,0,0,0.0)');
      ctx.fillStyle = tunnelGrad;
      ctx.fillRect(0, 0, w, h);
    }
    
    // Edge fade vignette to hide canvas edges during long sessions
    // Disabled during warp to avoid darkened edges in FULL warp mode
    if (modeRef.current !== 'warp') {
      const vignetteInner = Math.min(w, viewportH) * 0.45;
      const vignetteOuter = Math.min(w, viewportH) * 0.5;
      const vignette = ctx.createRadialGradient(centerX, centerY, vignetteInner, centerX, centerY, vignetteOuter);
      vignette.addColorStop(0, 'rgba(0,0,0,0)');
      vignette.addColorStop(1, 'rgba(0,0,0,0.6)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, w, h);
    }
    
    // Continue animation if still active
    if (isAnimatingRef.current) {
      animIdRef.current = requestAnimationFrame(animate);
    }
  }, [isSessionActive]);
  
  // React to warp mode changes from store
  useEffect(() => {
    // Determine if canvas should be visible
    const isVisible = warpMode !== WARP_MODE.NONE;
    
    if (isVisible) {
      // Force reinitialize stars when transitioning from no warp to any warp mode
      // This fixes the black background issue after focus booster
      initStars(true);
      
      // Update mode based on warp setting
      // LIGHT_SPEED_EXPERIMENT: treat LIGHT_SPEED as 'warp' path initially
      if (warpMode === WARP_MODE.FULL || warpMode === WARP_MODE.LIGHT_SPEED) {
        modeRef.current = 'warp';
      } else {
        modeRef.current = 'idle';
      }
      
      // Only start animation if not already running
      if (!isAnimatingRef.current) {
        isAnimatingRef.current = true;
        animIdRef.current = requestAnimationFrame(animate);
      }
    } else {
      // Stop animation when warp mode is NONE
      isAnimatingRef.current = false;
      if (animIdRef.current) {
        cancelAnimationFrame(animIdRef.current);
        animIdRef.current = null;
      }
    }
  }, [warpMode, isSessionActive, initStars, animate]);

  // Setup and cleanup effects
  useEffect(() => {
    // Initialize stars and celestial bodies only if warp mode is active
    if (warpMode !== WARP_MODE.NONE) {
      initStars();
      initCelestialBodies();
    }
    
    // Set up resize handler and scroll observer
    const handleResizeAndScroll = () => {
      // Inline resize logic
      const canvas = canvasRef.current;
      if (canvas) {
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const wCss = Math.max(window.innerWidth, document.documentElement.scrollWidth || 0);
        const hCss = Math.max(window.innerHeight, document.documentElement.scrollHeight || 0, document.body.scrollHeight || 0);
        
        canvas.width = Math.floor(wCss * dpr);
        canvas.height = Math.floor(hCss * dpr);
        canvas.style.width = `${wCss}px`;
        canvas.style.height = `${hCss}px`;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }
      }
      
      // Re-initialize stars and bodies on significant resize
      if (warpMode !== WARP_MODE.NONE && starsInitializedRef.current) {
        initStars(true);
        initCelestialBodies();
      }
    };
    
    window.addEventListener('resize', handleResizeAndScroll);
    window.addEventListener('scroll', handleResizeAndScroll);
    
    // Watch for document height changes - observe both body and documentElement
    const resizeObserver = new ResizeObserver(() => {
      handleResizeAndScroll();
    });
    resizeObserver.observe(document.body);
    resizeObserver.observe(document.documentElement);
    
    // Initial canvas setup
    handleResizeAndScroll();
    
    // Start animation if warp mode is active
    if (warpMode !== WARP_MODE.NONE) {
      isAnimatingRef.current = true;
      animIdRef.current = requestAnimationFrame(animate);
    }
    
    return () => {
      // Stop animation
      resizeObserver.disconnect();
      if (animIdRef.current) {
        cancelAnimationFrame(animIdRef.current);
      }
      window.removeEventListener('resize', handleResizeAndScroll);
      window.removeEventListener('scroll', handleResizeAndScroll);
    };
  }, [initStars, initCelestialBodies, handleResize, animate, warpMode]);

  // Warp mode effect: update target speed based on mode and session state
  useEffect(() => {
    if (warpMode === WARP_MODE.NONE) {
      // Still have slow idle movement when no warp mode
      targetSpeedRef.current = IDLE_SPEED;
      modeRef.current = 'idle';
      warpPhaseRef.current = 'idle';
    } else if (warpMode === WARP_MODE.BACKGROUND || warpMode === WARP_MODE.FULL || warpMode === WARP_MODE.LIGHT_SPEED) {
      // Only accelerate to warp speed during active sessions
      if (isSessionActive) {
        targetSpeedRef.current = 25 * speedMultiplier;  // WARP_SPEED equivalent
        modeRef.current = 'warp';
        warpPhaseRef.current = 'accelerating';
      } else {
        // Keep idle speed when not in session
        targetSpeedRef.current = IDLE_SPEED;
        modeRef.current = 'idle';
        warpPhaseRef.current = 'idle';
      }
      // Don't re-initialize stars to keep smooth transition
    } else {
      targetSpeedRef.current = IDLE_SPEED;
      modeRef.current = 'idle';
      warpPhaseRef.current = 'idle';
    }
  }, [warpMode, speedMultiplier, isSessionActive]);

  // LIGHT_SPEED_EXPERIMENT: update LS active ref only during active session (prelaunch stays regular)
  useEffect(() => {
    const active = EXPERIMENT_LIGHT_SPEED && warpMode === WARP_MODE.LIGHT_SPEED && isSessionActive;
    isLightSpeedRef.current = active;
    const wasActive = lsEngageRef.current.lastActive;
    if (active && !wasActive) {
      // Start engage sequence on launch
      lsEngageRef.current.phase = reduceMotionRef.current ? 'extend' : 'shake';
      lsEngageRef.current.t0 = performance.now() * 0.001; // seconds
      lsEngageRef.current.lastActive = true;
    } else if (!active && wasActive) {
      // Reset when exiting LS or ending session
      lsEngageRef.current.phase = 'idle';
      lsEngageRef.current.t0 = 0;
      lsEngageRef.current.lastActive = false;
    } else {
      // Keep in sync
      lsEngageRef.current.lastActive = active;
    }
  }, [warpMode, isSessionActive]);

  // Track if current warp mode is FULL for tunnel overlay decisions inside rAF
  useEffect(() => {
    isFullWarpRef.current = warpMode === WARP_MODE.FULL;
  }, [warpMode]);

  // Determine canvas visibility and z-index based on warp mode
  const canvasStyle = React.useMemo(() => {
    if (warpMode === WARP_MODE.NONE) {
      return { display: 'none' } as const;
    }
    const isFullOverlay =
      warpMode === WARP_MODE.FULL ||
      (warpMode === WARP_MODE.LIGHT_SPEED && lightSpeedFullscreen);
    return isFullOverlay
      ? {
          position: 'fixed' as const,
          top: 0,
          left: 0,
          backgroundColor: 'black',
          zIndex: 9999,
          pointerEvents: 'none' as const
        }
      : {
          position: 'fixed' as const,
          top: 0,
          left: 0,
          backgroundColor: 'black',
          zIndex: 1,
          pointerEvents: 'none' as const
        };
  }, [warpMode, lightSpeedFullscreen]);
  
  return (
    <canvas
      ref={canvasRef}
      className="starfield-canvas"
      style={canvasStyle}
    />
  );
});

StarfieldCanvas.displayName = 'StarfieldCanvas';
