import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { WARP_MODE, WARP_ANIMATION, STORAGE_KEYS, STARFIELD_QUALITY, THRUST_SHAKE_DURATION_MS, EXPERIMENT_LIGHT_SPEED } from '../constants';

// LIGHT_SPEED_EXPERIMENT: debug marker for sanity checks
console.log('[LIGHT_SPEED_EXPERIMENT] warpSlice.ts loaded; EXPERIMENT_LIGHT_SPEED =', EXPERIMENT_LIGHT_SPEED);

// Warp mode types using constants
export type WarpMode = typeof WARP_MODE[keyof typeof WARP_MODE];
export type StarfieldQualityType = typeof STARFIELD_QUALITY[keyof typeof STARFIELD_QUALITY];

// Define the initial state for reuse in reset function and tests
export const initialWarpState = {
  warpMode: WARP_MODE.BACKGROUND as WarpMode,
  speedMultiplier: 1.0, // Changed from warpSpeed to speedMultiplier (0.1-1.0)
  showExitButton: false,
  showDistractionInWarp: false,
  starfieldQuality: STARFIELD_QUALITY.STANDARD as StarfieldQualityType,
  isThrusting: false,
  isDecelerating: false, // New state for session end deceleration
  thrustTransitionProgress: 0, // 0 to 1 for smooth transition
  effectiveSpeed: WARP_ANIMATION.DEFAULT_SPEED, // Actual speed used for rendering
};

// Define the warp state interface
interface WarpState {
  warpMode: WarpMode;
  speedMultiplier: number; // Changed from warpSpeed to speedMultiplier
  showExitButton: boolean;
  showDistractionInWarp: boolean;
  starfieldQuality: StarfieldQualityType;
  isThrusting: boolean;
  isDecelerating: boolean; // New state for session end deceleration
  thrustTransitionProgress: number;
  effectiveSpeed: number;
}

// Define warp actions
interface WarpActions {
  setWarpMode: (mode: WarpMode) => void;
  setSpeedMultiplier: (multiplier: number) => void; // Changed from setWarpSpeed
  setShowExitButton: (show: boolean) => void;
  setShowDistractionInWarp: (show: boolean) => void;
  setStarfieldQuality: (quality: StarfieldQualityType) => void;
  setIsThrusting: (isThrusting: boolean) => void;
  setIsDecelerating: (isDecelerating: boolean) => void; // New setter
  setThrustTransitionProgress: (progress: number) => void;
  setEffectiveSpeed: (speed: number) => void;
  triggerThrust: (durationMs?: number) => void;
  startSessionWarp: () => void; // New function for session start
  endSessionWarp: () => void; // New function for session end
  updateEffectiveSpeed: (isSessionActive: boolean) => void;
  reset: () => void; // Reset function for testing
}

// Create the warp store
export const useWarpStore = create<WarpState & WarpActions>()(
  persist(
    (set, get) => ({
      // Default state values
      ...initialWarpState,
      
      // Actions
      setWarpMode: (mode) => {
        // LIGHT_SPEED_EXPERIMENT: sanitize when flag disabled
        const nextMode = (!EXPERIMENT_LIGHT_SPEED && mode === WARP_MODE.LIGHT_SPEED)
          ? WARP_MODE.FULL
          : mode;
        set({ warpMode: nextMode });
      },
      setSpeedMultiplier: (multiplier) => {
        // Ensure multiplier is between 0.1 and 1.0
        const clampedMultiplier = Math.max(0.1, Math.min(1.0, multiplier));
        set({ speedMultiplier: clampedMultiplier });
        
        // Update effective speed immediately for responsive feel
        if (!get().isThrusting && !get().isDecelerating) {
          get().updateEffectiveSpeed(true); // Update speed with current session state
        }
      },
      setShowExitButton: (show) => set({ showExitButton: show }),
      setShowDistractionInWarp: (show) => set({ showDistractionInWarp: show }),
      setStarfieldQuality: (quality) => set({ starfieldQuality: quality }),
      setIsThrusting: (isThrusting) => set({ isThrusting }),
      setIsDecelerating: (isDecelerating) => set({ isDecelerating }),
      setThrustTransitionProgress: (progress) => set({ thrustTransitionProgress: progress }),
      setEffectiveSpeed: (speed) => set({ effectiveSpeed: speed }),
      
      // Complex actions
      triggerThrust: (durationMs = THRUST_SHAKE_DURATION_MS) => {
        // Set thrusting to true with dramatically enhanced speed
        set({ 
          isThrusting: true,
          thrustTransitionProgress: 0,
          effectiveSpeed: WARP_ANIMATION.THRUST_EFFECT_SPEED // Significantly increased speed for dramatic effect
        });
        
        // Reset thrusting state after shake duration but DON'T decelerate
        // This is a key change - we want to maintain high speed after thrust
        setTimeout(() => {
          set({ isThrusting: false });
          
          // Instead of decelerating, update to the appropriate speed based on session state
          get().updateEffectiveSpeed(true); // Force update with session active
        }, durationMs);
      },
      
      // New function to start warp when a session begins
      startSessionWarp: () => {
        // First trigger the initial thrust effect
        get().triggerThrust();
        
        // The updateEffectiveSpeed will be called after the thrust effect ends
        // which will set the speed to DEFAULT_SESSION_SPEED * speedMultiplier
      },
      
      // New function to handle session end with smooth deceleration
      endSessionWarp: () => {
        const state = get();
        
        // Skip if already decelerating or not in a valid warp mode
        if (state.isDecelerating || state.warpMode === WARP_MODE.NONE) {
          return;
        }
        
        // Start deceleration
        set({ isDecelerating: true });
        
        // Capture the current speed as the starting point
        const startSpeed = state.effectiveSpeed;
        const targetSpeed = WARP_ANIMATION.IDLE_SPEED_FACTOR;
        
        // Set up smooth deceleration animation
        let decelerationProgress = 0;
        const decelerationStep = 16; // ms per step (approx 60fps)
        const decelerationDuration = WARP_ANIMATION.DECELERATION_DURATION_MS;
        
        const decelerationInterval = setInterval(() => {
          decelerationProgress += decelerationStep / decelerationDuration;
          
          if (decelerationProgress >= 1) {
            decelerationProgress = 1;
            clearInterval(decelerationInterval);
            
            // End deceleration state
            set({ 
              isDecelerating: false,
              effectiveSpeed: targetSpeed
            });
            return;
          }
          
          // Use cubic ease-out for natural deceleration feel
          // easeOutCubic = 1 - Math.pow(1 - x, 3)
          const easeOutCubic = 1 - Math.pow(1 - decelerationProgress, 3);
          
          // Calculate current speed during deceleration
          const currentSpeed = startSpeed - (startSpeed - targetSpeed) * easeOutCubic;
          
          set({ effectiveSpeed: currentSpeed });
        }, decelerationStep);
      },
      
      updateEffectiveSpeed: (isSessionActive) => {
        const state = get();
        
        // If thrusting or decelerating, don't update speed
        if (state.isThrusting || state.isDecelerating) {
          return;
        }
        
        if (isSessionActive) {
          // During active sessions, use DEFAULT_SESSION_SPEED * speedMultiplier
          // This is a key change - we now use a high default speed during sessions
          const sessionSpeed = WARP_ANIMATION.DEFAULT_SESSION_SPEED * state.speedMultiplier;
          set({ effectiveSpeed: sessionSpeed });
        } else if (state.warpMode === WARP_MODE.BACKGROUND) {
          // When not in a session, use idle factor for subtle drift
          set({ effectiveSpeed: WARP_ANIMATION.IDLE_SPEED_FACTOR });
        } else {
          // In full warp mode without a session, use the normal speed calculation
          // This is for manual control outside of sessions
          const manualSpeed = 10.0 * state.speedMultiplier; // Max speed is 10.0
          set({ effectiveSpeed: manualSpeed });
        }
      },
      
      reset: () => set(initialWarpState), // Reset function for testing
    }),
    {
      name: STORAGE_KEYS.WARP, // localStorage key
      version: 1,
      partialize: (state) => ({
        // Only persist these values in localStorage
        warpMode: state.warpMode,
        speedMultiplier: state.speedMultiplier, // Changed from warpSpeed
        showExitButton: state.showExitButton,
        showDistractionInWarp: state.showDistractionInWarp,
        starfieldQuality: state.starfieldQuality,
      }),
      // LIGHT_SPEED_EXPERIMENT: coerce persisted light_speed to FULL when the experiment is disabled
      migrate: (persistedState: any) => {
        if (!persistedState) return persistedState;
        if (!EXPERIMENT_LIGHT_SPEED && persistedState.warpMode === WARP_MODE.LIGHT_SPEED) {
          return { ...persistedState, warpMode: WARP_MODE.FULL };
        }
        return persistedState;
      }
    }
  )
); 