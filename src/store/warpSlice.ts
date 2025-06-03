import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { WARP_MODE, WARP_ANIMATION, STORAGE_KEYS, STARFIELD_QUALITY, THRUST_SHAKE_DURATION_MS } from '../constants';

// Warp mode types using constants
export type WarpMode = typeof WARP_MODE[keyof typeof WARP_MODE];
export type StarfieldQualityType = typeof STARFIELD_QUALITY[keyof typeof STARFIELD_QUALITY];

// Define the initial state for reuse in reset function and tests
export const initialWarpState = {
  warpMode: WARP_MODE.NONE as WarpMode,
  warpSpeed: WARP_ANIMATION.DEFAULT_SPEED,
  showExitButton: false,
  showDistractionInWarp: false,
  starfieldQuality: STARFIELD_QUALITY.STANDARD as StarfieldQualityType,
  isThrusting: false,
};

// Define the warp state interface
interface WarpState {
  warpMode: WarpMode;
  warpSpeed: number;
  showExitButton: boolean;
  showDistractionInWarp: boolean;
  starfieldQuality: StarfieldQualityType;
  isThrusting: boolean;
}

// Define warp actions
interface WarpActions {
  setWarpMode: (mode: WarpMode) => void;
  setWarpSpeed: (speed: number) => void;
  setShowExitButton: (show: boolean) => void;
  setShowDistractionInWarp: (show: boolean) => void;
  setStarfieldQuality: (quality: StarfieldQualityType) => void;
  setIsThrusting: (isThrusting: boolean) => void;
  triggerThrust: (durationMs?: number) => void;
  reset: () => void; // Reset function for testing
}

// Create the warp store
export const useWarpStore = create<WarpState & WarpActions>()(
  persist(
    (set) => ({
      // Default state values
      ...initialWarpState,
      
      // Actions
      setWarpMode: (mode) => set({ warpMode: mode }),
      setWarpSpeed: (speed) => set({ warpSpeed: speed }),
      setShowExitButton: (show) => set({ showExitButton: show }),
      setShowDistractionInWarp: (show) => set({ showDistractionInWarp: show }),
      setStarfieldQuality: (quality) => set({ starfieldQuality: quality }),
      setIsThrusting: (isThrusting) => set({ isThrusting }),
      
      // Complex actions
      triggerThrust: (durationMs = THRUST_SHAKE_DURATION_MS) => {
        // Set thrusting to true
        set({ isThrusting: true });
        
        // Reset after duration
        setTimeout(() => {
          set({ isThrusting: false });
        }, durationMs);
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