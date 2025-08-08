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
  // Previous position for streaking effect
  prevX?: number;
  prevY?: number;
}

export const StarfieldCanvas: React.FC = memo(() => {
  // Get state from warp store
  const {
    warpMode,
    starfieldQuality,
    effectiveSpeed,
    isThrusting,
    updateEffectiveSpeed
  } = useWarpStore();

  // Get session state from timer store
  const { isSessionActive } = useTimerStore();

  // Refs for animation and DOM elements
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const starsRef = useRef<Star[]>([]);
  const animationFrameIdRef = useRef<number | null>(null);
  const lastDrawTimeRef = useRef<number>(0);
  const lastSpeedUpdateRef = useRef<number>(0);

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

    // Update effective speed based on session state (every 500ms)
    if (timestamp - lastSpeedUpdateRef.current > 500) {
      updateEffectiveSpeed(isSessionActive);
      lastSpeedUpdateRef.current = timestamp;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas with a solid black background for better edge behavior
    ctx.fillStyle = 'rgb(0, 0, 0)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Calculate speed based on quality and current state
    const baseSpeedFactor = STAR_SPEED_FACTORS_BY_QUALITY[starfieldQuality];
    
    // Use effectiveSpeed from the store which handles:
    // - Idle speed when no session is active (subtle drift with IDLE_SPEED_FACTOR)
    // - Thrust speed during thrust effect
    // - Smooth transition after thrust
    const speedMultiplier = Math.min(
      effectiveSpeed * baseSpeedFactor,
      WARP_ANIMATION.MAX_EFFECTIVE_SPEED
    );

    // Check if we are in idle mode (not static anymore, but very slow drift)
    const isIdleMode = !isSessionActive && warpMode === WARP_MODE.BACKGROUND;
    
    // Determine if we're in hyperspace mode based on our speed threshold
    const isHyperspace = speedMultiplier >= WARP_ANIMATION.HYPERSPACE_THRESHOLD;
    const isUltraSpeed = speedMultiplier >= WARP_ANIMATION.HYPERSPACE_THRESHOLD * 1.5;

    // Update and draw stars
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    starsRef.current.forEach((star) => {
      // For idle stars, ensure prevX/Y are properly tracked but with minimal movement
      if (isIdleMode) {
        // Save previous position for minimal streaking effect
        star.prevX = star.x * (WARP_ANIMATION.MAX_DEPTH / (star.z || 1)) + centerX;
        star.prevY = star.y * (WARP_ANIMATION.MAX_DEPTH / (star.z || 1)) + centerY;
        
        // Move star closer to viewer with the idle speed factor (very subtle)
        star.z -= 0.25 * speedMultiplier; // Further reduced for idle mode to be extra subtle
      } else {
        // For moving stars, store previous position for streaking
        star.prevX = star.x * (WARP_ANIMATION.MAX_DEPTH / (star.z || 1)) + centerX;
        star.prevY = star.y * (WARP_ANIMATION.MAX_DEPTH / (star.z || 1)) + centerY;

        // Move star closer to viewer (faster with speedFactor)
        star.z -= 1 * speedMultiplier;
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
          shouldStreak = star.z < WARP_ANIMATION.MAX_DEPTH * 0.3 && speedMultiplier > 0;
        } else {
          // Normal streak logic for active sessions
          shouldStreak = speedMultiplier >= WARP_ANIMATION.MIN_SPEED_FOR_STREAKS;
        }
        
        if (shouldStreak && star.prevX !== undefined && star.prevY !== undefined) {
          // Calculate streak length based on speed and star's z-position using enhanced formula
          // Speed ratio is proportional to how much over the min streak speed we are
          const speedRatio = Math.max(0, (speedMultiplier - WARP_ANIMATION.MIN_SPEED_FOR_STREAKS) / WARP_ANIMATION.MIN_SPEED_FOR_STREAKS);
          
          // Enhanced streak length calculation:
          // - Base length + additional length proportional to speed
          // - Use new constants for more control and more dramatic results at high speeds
          const depthFactor = Math.pow(1 - star.z / WARP_ANIMATION.MAX_DEPTH, 1.8); // Enhanced depth factor
          const streakLength = WARP_ANIMATION.STREAK_BASE_LENGTH + 
            (speedRatio * WARP_ANIMATION.STREAK_LENGTH_FACTOR * depthFactor);
          
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
            } else if (speedMultiplier > WARP_ANIMATION.MIN_SPEED_FOR_STREAKS * 2) {
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
            } else if (speedMultiplier > 5) {
              // Thinner at high speeds
              lineWidthFactor = 0.6;
            } else if (speedMultiplier > 3) {
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

  // Debug console log to verify the component is rendering with the correct mode
  console.log(`Rendering StarfieldCanvas with mode: ${warpMode}, quality: ${starfieldQuality}, isSessionActive: ${isSessionActive}`);

  // Setup and cleanup effects
  useEffect(() => {
    console.log('StarfieldCanvas initialization, warpMode:', warpMode, 'quality:', starfieldQuality);
    
    // Initialize stars
    initStars();
    
    // Set up resize handler
    window.addEventListener('resize', handleResize);
    
    // Make sure canvas is properly sized on initialization
    handleResize();
    
    // Start animation if warp mode is active
    if (warpMode !== WARP_MODE.NONE && starfieldQuality !== STARFIELD_QUALITY.OFF) {
      console.log('Starting animation');
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
    // Reinitialize stars with new mode
    initStars();
    
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
    
    // Update effective speed based on new mode
    updateEffectiveSpeed(isSessionActive);
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
  
  // Handle changes to session state or effective speed
  useEffect(() => {
    // Immediately update the effective speed based on session state
    updateEffectiveSpeed(isSessionActive);
    
    // Cancel any existing animation frame to avoid multiple loops
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }
    
    // Start animation if it should be running
    if (warpMode !== WARP_MODE.NONE && starfieldQuality !== STARFIELD_QUALITY.OFF) {
      console.log('Starting animation due to session state change:', isSessionActive, 'or effectiveSpeed change:', effectiveSpeed);
      animationFrameIdRef.current = requestAnimationFrame(animateStars);
    }
  }, [isSessionActive, effectiveSpeed, warpMode, starfieldQuality, isThrusting, dimensions]);

  // Skip rendering if warp mode is none or quality is off
  if (warpMode === WARP_MODE.NONE || starfieldQuality === STARFIELD_QUALITY.OFF) {
    return null;
  }

  // Debug console log to verify the component is rendering with the correct mode
  console.log(`Rendering StarfieldCanvas with mode: ${warpMode}, quality: ${starfieldQuality}`);

  // Determine canvas styling based on warp mode
  const canvasStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    zIndex: 1, // Lower than the main content's z-index
    pointerEvents: 'none',
    opacity: 1, // Use full opacity to ensure visibility
    backgroundColor: 'black', // Ensure black background
    transition: 'opacity 0.3s ease-in-out', // Smooth opacity transitions
  };

  // Override specific properties for FULL mode
  if (warpMode === WARP_MODE.FULL) {
    canvasStyle.zIndex = 9999;
    canvasStyle.pointerEvents = 'auto';
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