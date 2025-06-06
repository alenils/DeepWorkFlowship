import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { APP_MODE, AUDIO_VOLUME, STORAGE_KEYS } from '../constants';

// Define the initial state for reuse in reset function and tests
export const initialAppState = {
  performanceMode: false,
  sfxVolume: AUDIO_VOLUME.DEFAULT_SFX,
  musicVolume: AUDIO_VOLUME.DEFAULT_MUSIC,
  pwaInstallPromptShown: false,
  isDarkMode: window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ?? false,
  currentMode: APP_MODE.STANDBY,
};

// Define the type for our app state
export interface AppState {
  // Global app settings
  performanceMode: boolean;
  sfxVolume: number;
  musicVolume: number;
  pwaInstallPromptShown: boolean;
  isDarkMode: boolean;
  
  // App mode - 'focus', 'warp', etc.
  currentMode: typeof APP_MODE[keyof typeof APP_MODE];
  
  // Actions
  setPerformanceMode: (mode: boolean) => void;
  setSfxVolume: (volume: number) => void;
  setMusicVolume: (volume: number) => void;
  setPwaInstallPromptShown: (shown: boolean) => void;
  setDarkMode: (isDark: boolean) => void;
  setCurrentMode: (mode: typeof APP_MODE[keyof typeof APP_MODE]) => void;
  reset: () => void; // Reset function for testing
}

// Create the store with persist middleware to save to localStorage
export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Default state values
      ...initialAppState,

      // Actions (state updaters)
      setPerformanceMode: (mode) => set({ performanceMode: mode }),
      setSfxVolume: (volume) => set({ sfxVolume: volume }),
      setMusicVolume: (volume) => set({ musicVolume: volume }),
      setPwaInstallPromptShown: (shown) => set({ pwaInstallPromptShown: shown }),
      setDarkMode: (isDark) => set({ isDarkMode: isDark }),
      setCurrentMode: (mode) => set({ currentMode: mode }),
      reset: () => set(initialAppState), // Reset function for testing
    }),
    {
      name: STORAGE_KEYS.APP, // localStorage key
      partialize: (state) => ({
        // Only persist these values in localStorage
        performanceMode: state.performanceMode,
        sfxVolume: state.sfxVolume,
        musicVolume: state.musicVolume,
        pwaInstallPromptShown: state.pwaInstallPromptShown,
        isDarkMode: state.isDarkMode,
      }),
    }
  )
); 