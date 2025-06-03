import { useEffect, useRef, useState } from 'react';
import { useWarpStore } from '../../store/warpSlice';
import {
  WARP_MODE,
  WARP_ANIMATION,
  CSS_CLASSES,
  ELEMENT_IDS,
  STAR_COUNTS_BY_QUALITY,
  STAR_SPEED_FACTORS_BY_QUALITY,
  STAR_DRAW_INTERVAL_BY_QUALITY,
  STARFIELD_QUALITY
} from '../../constants';

// Define star interface for type safety
interface Star {
  x: number;
  y: number;
  z: number;
  size?: number;
  color?: string;
}

export const StarfieldCanvas: React.FC = () => {
  // Get state from warp store
  const {
    warpMode,
    warpSpeed,
    starfieldQuality,
    isThrusting
  } = useWarpStore();

  // Refs for animation and DOM elements
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const starsRef = useRef<Star[]>([]);
  const animationFrameIdRef = useRef<number | null>(null);
  const lastDrawTimeRef = useRef<number>(0);

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

    const count = STAR_COUNTS_BY_QUALITY[starfieldQuality];
    const stars: Star[] = [];

    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * window.innerWidth * 2 - window.innerWidth,
        y: Math.random() * window.innerHeight * 2 - window.innerHeight,
        z: Math.random() * WARP_ANIMATION.MAX_DEPTH,
        size: Math.random() * 1.5 + 0.5, // Base star size (will be scaled by z-position)
        color: `rgba(${Math.floor(Math.random() * 55) + 200}, ${Math.floor(Math.random() * 55) + 200}, ${Math.floor(Math.random() * 55) + 200}, 1)` // Slightly varied white/blue colors
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

  // Animation function
  const animateStars = (timestamp: number) => {
    if (!canvasRef.current) return;

    // Check if we should draw this frame based on quality setting
    const drawInterval = STAR_DRAW_INTERVAL_BY_QUALITY[starfieldQuality];
    if (drawInterval === 0) {
      // Quality is OFF, don't animate
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
      return;
    }

    // Only draw if enough time has passed since last draw
    if (timestamp - lastDrawTimeRef.current < drawInterval) {
      animationFrameIdRef.current = requestAnimationFrame(animateStars);
      return;
    }

    lastDrawTimeRef.current = timestamp;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Calculate speed based on quality and current state
    const baseSpeedFactor = STAR_SPEED_FACTORS_BY_QUALITY[starfieldQuality];
    const thrustBoost = isThrusting ? 2.5 : 1.0; // Boost speed during thrust
    const effectiveSpeed = warpSpeed * baseSpeedFactor * thrustBoost;

    // Update and draw stars
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    starsRef.current.forEach((star) => {
      // Move star closer to viewer (faster with speedFactor)
      star.z -= 1 * effectiveSpeed;

      // Reset star when it gets too close
      if (star.z <= 0) {
        star.z = WARP_ANIMATION.MAX_DEPTH;
        star.x = Math.random() * canvas.width * 2 - canvas.width;
        star.y = Math.random() * canvas.height * 2 - canvas.height;
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

        // Draw star
        ctx.beginPath();
        ctx.arc(starX, starY, size, 0, Math.PI * 2);
        
        // Use star's color if available, otherwise use white with alpha
        ctx.fillStyle = star.color ? star.color.replace('1)', `${alpha})`) : `rgba(255, 255, 255, ${alpha})`;
        ctx.fill();

        // Add glow effect for larger stars in ultra quality
        if (starfieldQuality === STARFIELD_QUALITY.ULTRA && size > 2) {
          ctx.beginPath();
          ctx.arc(starX, starY, size * 2, 0, Math.PI * 2);
          ctx.fillStyle = star.color ? star.color.replace('1)', `${alpha * 0.3})`) : `rgba(255, 255, 255, ${alpha * 0.3})`;
          ctx.fill();
        }
      }
    });

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
    } else if (mode === WARP_MODE.BACKGROUND) {
      // Fade numeric text
      document.querySelectorAll('.text-white, .dark\\:text-white, .text-gray-200, .dark\\:text-gray-200').forEach(el => {
        if (el.textContent && /[0-9]/.test(el.textContent)) {
          el.classList.add(CSS_CLASSES.OPACITY_70, CSS_CLASSES.WARP_DIMMED_TEXT);
        }
      });
      
      // Dim the minutes input
      if (minutesInput) {
        minutesInput.classList.add(CSS_CLASSES.WARP_DIM);
      }
    }
  };

  // Setup and cleanup effects
  useEffect(() => {
    // Initialize stars
    initStars();
    
    // Set up resize handler
    window.addEventListener('resize', handleResize);
    
    // Start animation if warp mode is active
    if (warpMode !== WARP_MODE.NONE && starfieldQuality !== STARFIELD_QUALITY.OFF) {
      animationFrameIdRef.current = requestAnimationFrame(animateStars);
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

  // Handle changes to warp mode
  useEffect(() => {
    // Apply DOM effects
    applyWarpModeEffects(warpMode);
    
    // Start or stop animation based on warp mode
    if (warpMode !== WARP_MODE.NONE && starfieldQuality !== STARFIELD_QUALITY.OFF) {
      if (!animationFrameIdRef.current) {
        animationFrameIdRef.current = requestAnimationFrame(animateStars);
      }
    } else {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
    }
  }, [warpMode]);

  // Handle changes to starfield quality
  useEffect(() => {
    // Re-initialize stars with new quality
    initStars();
    
    // Start or stop animation based on quality
    if (starfieldQuality !== STARFIELD_QUALITY.OFF && warpMode !== WARP_MODE.NONE) {
      if (!animationFrameIdRef.current) {
        animationFrameIdRef.current = requestAnimationFrame(animateStars);
      }
    } else {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
    }
  }, [starfieldQuality]);

  // Skip rendering if warp mode is none or quality is off
  if (warpMode === WARP_MODE.NONE || starfieldQuality === STARFIELD_QUALITY.OFF) {
    return null;
  }

  // Determine canvas styling based on warp mode
  const canvasStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    zIndex: warpMode === WARP_MODE.FULL ? 9999 : 0,
    pointerEvents: warpMode === WARP_MODE.FULL ? 'auto' : 'none',
    opacity: warpMode === WARP_MODE.FULL ? 1 : 0.7,
  };

  return (
    <canvas
      ref={canvasRef}
      id={warpMode === WARP_MODE.FULL ? ELEMENT_IDS.WARP_FULL : ELEMENT_IDS.WARP_BG}
      width={dimensions.width}
      height={dimensions.height}
      style={canvasStyle}
    />
  );
}; 