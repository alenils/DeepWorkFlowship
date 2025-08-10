import React, { useEffect, useRef, memo, useCallback } from 'react';
import { useTimerStore } from '../../store/timerSlice';

// ============================================================================
// TUNABLE CONSTANTS - Adjust these for different visual effects
// ============================================================================

// Layer configuration
const LAYERS = 4;                                    // Number of depth layers
const STARS_PER_LAYER = [30, 50, 75, 100];          // Stars per layer (front to back)
const LAYER_SPEED = [0.8, 0.6, 0.4, 0.2];           // Parallax speed multipliers
const LAYER_STREAK = [3.0, 2.5, 2.0, 1.5];          // Streak length multipliers in warp

// Visual parameters
const COLOR_PALETTE = [
  '#ffffff', '#ffffff', '#ffffff', '#ffffff',        // 50% white
  '#c8e6ff', '#c8e6ff',                             // 25% pale blue  
  '#ffe8c8',                                        // 12.5% pale gold
  '#ffc8c8'                                         // 12.5% pale red
];
const BASE_TWINKLE = 0.3;                           // Base twinkle brightness variation
const IDLE_ROT_SPEED = 0.00002;                     // Rotation speed for idle drift
const IDLE_DRIFT_RADIUS = 30;                       // Max drift radius in pixels

// Speed and transition
const IDLE_SPEED = 0.0;                             // Speed when idle
const WARP_SPEED = 20.0;                            // Max speed in warp mode
const SPEED_SMOOTHING = 0.02;                       // Speed transition smoothing (0-1)

// Performance
const MAX_DPR = 2;                                   // Max device pixel ratio for quality

// ============================================================================

// Star interface
interface Star {
  x: number;
  y: number;
  baseX: number;      // Original position for drift calculation
  baseY: number;
  size: number;
  colorIndex: number;
  twinklePhase: number;
  twinkleSpeed: number;
}

export const StarfieldCanvas: React.FC = memo(() => {
  // Get session state from timer store
  const { isSessionActive } = useTimerStore();

  // Canvas and animation refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animIdRef = useRef<number | undefined>(undefined);
  
  // Mode and speed state
  const modeRef = useRef<'idle' | 'warp'>('idle');
  const speedRef = useRef(0);                       // current forward speed
  const targetSpeedRef = useRef(IDLE_SPEED);        // target speed
  const rotPhaseRef = useRef(0);                    // rotation phase for idle drift
  
  // Layers and stars
  const layersRef = useRef<Star[][]>([]);

  // Initialize stars with layers and properties
  const initStars = useCallback(() => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    
    const makeStar = (): Star => ({
      x: Math.random() * w,
      y: Math.random() * h,
      baseX: Math.random() * w,
      baseY: Math.random() * h,
      size: 0.5 + Math.random() * 2.5,
      colorIndex: Math.floor(Math.random() * COLOR_PALETTE.length),
      twinklePhase: Math.random() * Math.PI * 2,
      twinkleSpeed: 0.2 + Math.random() * 0.4
    });
    
    // Create layers with increasing star counts
    layersRef.current = Array.from({ length: LAYERS }, (_, i) =>
      Array.from({ length: STARS_PER_LAYER[i] }, () => makeStar())
    );
  }, []);

  // Handle window resize
  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const dpr = Math.min(MAX_DPR, window.devicePixelRatio || 1);
    const w = window.innerWidth;
    const h = window.innerHeight;
    
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
    }
    
    // Reinitialize stars on resize
    initStars();
  }, [initStars]);

  // Main animation loop
  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const w = window.innerWidth;
    const h = window.innerHeight;
    const centerX = w / 2;
    const centerY = h / 2;
    
    // Clear canvas
    ctx.clearRect(0, 0, w, h);
    
    // Update speed with easing
    const speedDiff = targetSpeedRef.current - speedRef.current;
    if (Math.abs(speedDiff) > 0.01) {
      speedRef.current += speedDiff * SPEED_SMOOTHING;
    } else {
      speedRef.current = targetSpeedRef.current;
    }
    
    // Update rotation phase for idle drift
    if (modeRef.current === 'idle') {
      rotPhaseRef.current += IDLE_ROT_SPEED;
    }
    
    // Draw stars by layer (back to front for proper depth)
    for (let layerIdx = LAYERS - 1; layerIdx >= 0; layerIdx--) {
      const layer = layersRef.current[layerIdx];
      if (!layer) continue;
      
      const layerSpeed = LAYER_SPEED[layerIdx];
      const layerStreak = LAYER_STREAK[layerIdx];
      
      for (const star of layer) {
        // Calculate drift offset for idle mode
        let driftX = 0;
        let driftY = 0;
        
        if (modeRef.current === 'idle') {
          const angle = rotPhaseRef.current * (layerIdx + 1);
          const radius = IDLE_DRIFT_RADIUS * (1 - layerSpeed);
          driftX = Math.cos(angle) * radius;
          driftY = Math.sin(angle) * radius;
        }
        
        // Update star position
        if (speedRef.current > 0) {
          // Warp mode: move stars toward viewer
          const dx = star.x - centerX;
          const dy = star.y - centerY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance > 0) {
            const moveX = (dx / distance) * speedRef.current * layerSpeed;
            const moveY = (dy / distance) * speedRef.current * layerSpeed;
            star.x += moveX;
            star.y += moveY;
          }
          
          // Wrap stars that go off screen
          if (star.x < -50 || star.x > w + 50 || star.y < -50 || star.y > h + 50) {
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * 50;
            star.x = centerX + Math.cos(angle) * radius;
            star.y = centerY + Math.sin(angle) * radius;
            star.baseX = star.x;
            star.baseY = star.y;
          }
        } else {
          // Idle mode: apply drift
          star.x = star.baseX + driftX;
          star.y = star.baseY + driftY;
        }
        
        // Calculate twinkle
        let brightness = 1.0;
        star.twinklePhase += star.twinkleSpeed * 0.1;
        brightness = 1.0 - BASE_TWINKLE * 0.5 * (1 + Math.sin(star.twinklePhase));
        
        // Draw star
        ctx.save();
        ctx.globalAlpha = brightness;
        ctx.fillStyle = COLOR_PALETTE[star.colorIndex];
        
        if (speedRef.current > 1) {
          // Draw streak in warp mode
          const dx = star.x - centerX;
          const dy = star.y - centerY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const streakLength = speedRef.current * layerStreak * 2;
          
          if (distance > 0) {
            const streakX = -(dx / distance) * streakLength;
            const streakY = -(dy / distance) * streakLength;
            
            const gradient = ctx.createLinearGradient(
              star.x, star.y,
              star.x + streakX, star.y + streakY
            );
            gradient.addColorStop(0, COLOR_PALETTE[star.colorIndex]);
            gradient.addColorStop(1, 'transparent');
            
            ctx.strokeStyle = gradient;
            ctx.lineWidth = star.size;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(star.x, star.y);
            ctx.lineTo(star.x + streakX, star.y + streakY);
            ctx.stroke();
          }
        } else {
          // Draw point in idle mode
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
          ctx.fill();
        }
        
        ctx.restore();
      }
    }
    
    // Continue animation
    animIdRef.current = requestAnimationFrame(animate);
  }, []);

  // Handle keyboard input for warp toggle
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'w' || e.key === 'W') {
        modeRef.current = modeRef.current === 'idle' ? 'warp' : 'idle';
        targetSpeedRef.current = modeRef.current === 'warp' ? WARP_SPEED : IDLE_SPEED;
      }
    };

    window.addEventListener('keypress', handleKeyPress);
    return () => window.removeEventListener('keypress', handleKeyPress);
  }, []);

  // React to session state changes
  useEffect(() => {
    // Set mode based on session state
    const newMode = isSessionActive ? 'warp' : 'idle';
    if (modeRef.current !== newMode) {
      modeRef.current = newMode;
      targetSpeedRef.current = newMode === 'warp' ? WARP_SPEED : IDLE_SPEED;
    }
  }, [isSessionActive]);

  // Setup and cleanup effects
  useEffect(() => {
    // Initialize stars
    initStars();
    
    // Set up resize handler
    window.addEventListener('resize', handleResize);
    
    // Initial canvas setup
    handleResize();
    
    // Start animation
    animIdRef.current = requestAnimationFrame(animate);
    
    return () => {
      // Clean up animation
      if (animIdRef.current) {
        cancelAnimationFrame(animIdRef.current);
      }
      
      // Remove resize listener
      window.removeEventListener('resize', handleResize);
    };
  }, [initStars, handleResize, animate]);

  return (
    <canvas
      ref={canvasRef}
      className="starfield-canvas fixed inset-0 pointer-events-none"
      style={{ 
        backgroundColor: 'black', 
        zIndex: 1 
      }}
    />
  );
});

StarfieldCanvas.displayName = 'StarfieldCanvas';
