import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Warp mode types
export type WarpMode = 'none' | 'background' | 'full';

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
}

// Create the warp store
export const useWarpStore = create<WarpState & WarpActions>()(
  persist(
    (set) => ({
      // Default state values
      warpMode: 'none',
      warpSpeed: 1.1,
      showExitButton: false,
      showDistractionInWarp: false,
      
      // Actions
      setWarpMode: (mode) => set({ warpMode: mode }),
      setWarpSpeed: (speed) => set({ warpSpeed: speed }),
      setShowExitButton: (show) => set({ showExitButton: show }),
      setShowDistractionInWarp: (show) => set({ showDistractionInWarp: show }),
    }),
    {
      name: 'deepwork-warp-storage', // localStorage key
    }
  )
); 