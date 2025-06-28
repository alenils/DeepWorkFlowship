import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { FOCUS_BOOSTER, STORAGE_KEYS } from '../constants';
import { useWarpStore } from './warpSlice';

// Define the focus booster state type
export type FocusBoosterStatus = 'idle' | 'active' | 'finishing';

// Define the initial state
export const initialFocusBoosterState = {
  status: 'idle' as FocusBoosterStatus,
  progress: 0, // From 0 to 1
  startTime: null as number | null,
};

// Define the state interface
interface FocusBoosterState {
  status: FocusBoosterStatus;
  progress: number;
  startTime: number | null;
}

// Define the actions interface
interface FocusBoosterActions {
  startBooster: () => void;
  exitBooster: () => void;
  updateProgress: () => void;
  reset: () => void; // For testing
}

// Create the focus booster store
export const useFocusBoosterStore = create<FocusBoosterState & FocusBoosterActions>()(
  persist(
    (set, get) => ({
      // Default state
      ...initialFocusBoosterState,
      
      // Actions
      startBooster: () => {
        // First activate full warp mode
        useWarpStore.getState().setWarpMode('full');
        
        // Then start the booster
        set({
          status: 'active',
          progress: 0,
          startTime: Date.now(),
        });
        
        // Set up timer to update progress
        const updateInterval = setInterval(() => {
          const state = get();
          
          // Skip if not active or no start time
          if (state.status !== 'active' || state.startTime === null) {
            clearInterval(updateInterval);
            return;
          }
          
          // Calculate progress
          const elapsed = Date.now() - state.startTime;
          const progress = Math.min(elapsed / FOCUS_BOOSTER.DURATION_MS, 1);
          
          if (progress >= 1) {
            // Booster complete, transition to finishing state
            clearInterval(updateInterval);
            set({ 
              status: 'finishing',
              progress: 1
            });
            
            // After a delay, reset to idle
            setTimeout(() => {
              get().exitBooster();
            }, FOCUS_BOOSTER.COMPLETION_TEXT_DURATION_MS);
          } else {
            // Update progress
            set({ progress });
          }
        }, 16); // Update approximately every frame (60fps)
        
        return () => clearInterval(updateInterval);
      },
      
      exitBooster: () => {
        // Reset the booster state without changing warp mode
        set({
          status: 'idle',
          progress: 0,
          startTime: null,
        });
      },
      
      updateProgress: () => {
        const state = get();
        
        // Skip if not active or no start time
        if (state.status !== 'active' || state.startTime === null) {
          return;
        }
        
        // Calculate progress
        const elapsed = Date.now() - state.startTime;
        const progress = Math.min(elapsed / FOCUS_BOOSTER.DURATION_MS, 1);
        
        // Update progress
        set({ progress });
      },
      
      reset: () => set(initialFocusBoosterState),
    }),
    {
      name: STORAGE_KEYS.FOCUS_BOOSTER, // localStorage key
      partialize: (state) => ({
        // Only persist these values in localStorage
        status: state.status,
      }),
    }
  )
); 