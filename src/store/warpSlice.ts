import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { WARP_MODE, WARP_ANIMATION } from '../constants';

// Warp mode types using constants
export type WarpMode = typeof WARP_MODE[keyof typeof WARP_MODE];

// Define the initial state for reuse in reset function and tests
export const initialWarpState = {
  warpMode: WARP_MODE.NONE as WarpMode,
  warpSpeed: WARP_ANIMATION.DEFAULT_SPEED,
  showExitButton: false,
  showDistractionInWarp: false,
};

// Define the warp state interface
interface WarpState {
  warpMode: WarpMode;
  warpSpeed: number;
  showExitButton: boolean;
  showDistractionInWarp: boolean;
}

// Define warp actions
interface WarpActions {
  setWarpMode: (mode: WarpMode) => void;
  setWarpSpeed: (speed: number) => void;
  setShowExitButton: (show: boolean) => void;
  setShowDistractionInWarp: (show: boolean) => void;
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
      reset: () => set(initialWarpState), // Reset function for testing
    }),
    {
      name: 'deepwork-warp-storage', // localStorage key
    }
  )
); 