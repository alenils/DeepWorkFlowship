import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { WARP_MODE, WARP_ANIMATION, STORAGE_KEYS, STARFIELD_QUALITY, THRUST_SHAKE_DURATION_MS } from '../constants';

// Warp mode types using constants
export type WarpMode = typeof WARP_MODE[keyof typeof WARP_MODE];
export type StarfieldQualityType = typeof STARFIELD_QUALITY[keyof typeof STARFIELD_QUALITY];

// Define the initial state for reuse in reset function and tests
export const initialWarpState = {
  warpMode: WARP_MODE.BACKGROUND as WarpMode,
  warpSpeed: WARP_ANIMATION.DEFAULT_SPEED,
  showExitButton: false,
  showDistractionInWarp: false,
  starfieldQuality: STARFIELD_QUALITY.STANDARD as StarfieldQualityType,
  isThrusting: false,
  thrustTransitionProgress: 0, // 0 to 1 for smooth transition
  effectiveSpeed: WARP_ANIMATION.DEFAULT_SPEED, // Actual speed used for rendering
};

// Define the warp state interface
interface WarpState {
  warpMode: WarpMode;
  warpSpeed: number;
  showExitButton: boolean;
  showDistractionInWarp: boolean;
  starfieldQuality: StarfieldQualityType;
  isThrusting: boolean;
  thrustTransitionProgress: number;
  effectiveSpeed: number;
}

// Define warp actions
interface WarpActions {
  setWarpMode: (mode: WarpMode) => void;
  setWarpSpeed: (speed: number) => void;
  setShowExitButton: (show: boolean) => void;
  setShowDistractionInWarp: (show: boolean) => void;
  setStarfieldQuality: (quality: StarfieldQualityType) => void;
  setIsThrusting: (isThrusting: boolean) => void;
  setThrustTransitionProgress: (progress: number) => void;
  setEffectiveSpeed: (speed: number) => void;
  triggerThrust: (durationMs?: number) => void;
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
      setWarpMode: (mode) => set({ warpMode: mode }),
      setWarpSpeed: (speed) => set({ warpSpeed: speed }),
      setShowExitButton: (show) => set({ showExitButton: show }),
      setShowDistractionInWarp: (show) => set({ showDistractionInWarp: show }),
      setStarfieldQuality: (quality) => set({ starfieldQuality: quality }),
      setIsThrusting: (isThrusting) => set({ isThrusting }),
      setThrustTransitionProgress: (progress) => set({ thrustTransitionProgress: progress }),
      setEffectiveSpeed: (speed) => set({ effectiveSpeed: speed }),
      
      // Complex actions
      triggerThrust: (durationMs = THRUST_SHAKE_DURATION_MS) => {
        const state = get();
        
        // Set thrusting to true with dramatically enhanced speed
        set({ 
          isThrusting: true,
          thrustTransitionProgress: 0,
          effectiveSpeed: WARP_ANIMATION.THRUST_EFFECT_SPEED // Significantly increased speed for dramatic effect
        });
        
        // Reset thrusting state after shake duration
        setTimeout(() => {
          set({ isThrusting: false });
          
          // Start transition back to normal speed with enhanced deceleration curve
          let transitionProgress = 0;
          const transitionStep = 16; // ms per step (approx 60fps)
          const transitionDuration = WARP_ANIMATION.THRUST_FADE_DURATION_MS;
          const startSpeed = WARP_ANIMATION.THRUST_EFFECT_SPEED;
          const targetSpeed = state.warpSpeed;
          
          const transitionInterval = setInterval(() => {
            transitionProgress += transitionStep / transitionDuration;
            
            if (transitionProgress >= 1) {
              transitionProgress = 1;
              clearInterval(transitionInterval);
            }
            
            // Enhanced ease-out quintic curve: 1 - (1 - x)^5
            // This creates a dramatic initial deceleration that gradually slows
            const easeOutQuintic = 1 - Math.pow(1 - transitionProgress, 5);
            
            // Apply the easing function to calculate current speed
            const currentSpeed = startSpeed - (startSpeed - targetSpeed) * easeOutQuintic;
            
            set({
              thrustTransitionProgress: transitionProgress,
              effectiveSpeed: currentSpeed
            });
          }, transitionStep);
        }, durationMs);
      },
      
      updateEffectiveSpeed: (isSessionActive) => {
        const state = get();
        
        // If thrusting, don't update speed
        if (state.isThrusting || state.thrustTransitionProgress < 1) {
          return;
        }
        
        // If not in a session and in background mode, set speed to zero (completely static)
        if (!isSessionActive && state.warpMode === WARP_MODE.BACKGROUND) {
          set({ effectiveSpeed: 0 }); // Ensure stars are completely static when not in session
        } else {
          // Otherwise use normal warp speed
          set({ effectiveSpeed: state.warpSpeed });
        }
      },
      
      reset: () => set(initialWarpState), // Reset function for testing
    }),
    {
      name: STORAGE_KEYS.WARP, // localStorage key
      partialize: (state) => ({
        // Only persist these values in localStorage
        warpMode: state.warpMode,
        warpSpeed: state.warpSpeed,
        showExitButton: state.showExitButton,
        showDistractionInWarp: state.showDistractionInWarp,
        starfieldQuality: state.starfieldQuality,
      }),
    }
  )
); 