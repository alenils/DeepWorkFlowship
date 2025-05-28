import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface TimerState {
  // Timer configuration
  minutes: string;
  isInfinite: boolean;
  
  // Session state
  isSessionActive: boolean;
  isPaused: boolean;
  currentGoal: string;
  currentDifficulty: 'easy' | 'medium' | 'hard';
  sessionStartTime: number;
  remainingTime: number;
  distractionCount: number;
  sessionDurationMs: number;
  
  // Actions
  setMinutes: (minutes: string) => void;
  setIsInfinite: (isInfinite: boolean) => void;
  setIsSessionActive: (isActive: boolean) => void;
  setIsPaused: (isPaused: boolean) => void;
  setCurrentGoal: (goal: string) => void;
  setCurrentDifficulty: (difficulty: 'easy' | 'medium' | 'hard') => void;
  setSessionStartTime: (time: number) => void;
  setRemainingTime: (time: number) => void;
  setDistractionCount: (count: number) => void;
  incrementDistractionCount: () => void;
  setSessionDurationMs: (duration: number) => void;
  resetSession: () => void;
}

export const useTimerStore = create<TimerState>()(
  persist(
    (set) => ({
      // Default state values
      minutes: '25',
      isInfinite: false,
      isSessionActive: false,
      isPaused: false,
      currentGoal: '',
      currentDifficulty: 'medium',
      sessionStartTime: 0,
      remainingTime: 0,
      distractionCount: 0,
      sessionDurationMs: 0,
      
      // Actions
      setMinutes: (minutes) => set({ minutes }),
      setIsInfinite: (isInfinite) => set({ isInfinite }),
      setIsSessionActive: (isActive) => set({ isSessionActive: isActive }),
      setIsPaused: (isPaused) => set({ isPaused }),
      setCurrentGoal: (goal) => set({ currentGoal: goal }),
      setCurrentDifficulty: (difficulty) => set({ currentDifficulty: difficulty }),
      setSessionStartTime: (time) => set({ sessionStartTime: time }),
      setRemainingTime: (time) => set({ remainingTime: time }),
      setDistractionCount: (count) => set({ distractionCount: count }),
      incrementDistractionCount: () => set((state) => ({ distractionCount: state.distractionCount + 1 })),
      setSessionDurationMs: (duration) => set({ sessionDurationMs: duration }),
      resetSession: () => set({
        isSessionActive: false,
        isPaused: false,
        currentGoal: '',
        sessionStartTime: 0,
        remainingTime: 0,
        distractionCount: 0,
        sessionDurationMs: 0
      })
    }),
    {
      name: 'deepwork-timer-storage', // localStorage key
      partialize: (state) => ({
        // Only persist these values in localStorage
        minutes: state.minutes,
        isInfinite: state.isInfinite,
      }),
    }
  )
); 