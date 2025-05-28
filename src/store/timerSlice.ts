import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useEffect, useRef } from 'react';

// TypeScript type for the timer ID
type TimerId = ReturnType<typeof setInterval> | null;

// Define our session difficulty types
type Difficulty = 'easy' | 'medium' | 'hard';

// Import SFX functions if available (commented for now, would need to be imported)
// import { playSfx, SFX } from '../utils/sounds';

export interface TimerState {
  // Timer configuration
  minutes: string;
  isInfinite: boolean;
  
  // Session state
  isSessionActive: boolean;
  isPaused: boolean;
  currentGoal: string;
  currentDifficulty: Difficulty;
  sessionStartTime: number;
  remainingTime: number;
  distractionCount: number;
  sessionDurationMs: number;
  
  // Internal timer state
  isRunning: boolean;
  
  // Simple actions (state setters)
  setMinutes: (minutes: string) => void;
  setIsInfinite: (isInfinite: boolean) => void;
  setIsSessionActive: (isActive: boolean) => void;
  setIsPaused: (isPaused: boolean) => void;
  setCurrentGoal: (goal: string) => void;
  setCurrentDifficulty: (difficulty: Difficulty) => void;
  setSessionStartTime: (time: number) => void;
  setRemainingTime: (time: number | ((prevTime: number) => number)) => void;
  setDistractionCount: (count: number) => void;
  incrementDistractionCount: () => void;
  setSessionDurationMs: (duration: number) => void;
  resetSession: () => void;
  
  // Complex actions (business logic)
  handleMinutesChange: (value: string) => void;
  handleGoalSet: (goal: string) => void;
  handleDifficultySet: (difficulty: Difficulty) => void;
  startSession: () => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  stopTimer: () => void;
  addDistraction: () => void;
  endSession: () => void;
}

// This function will be exported to allow components to use the timer
export const useTimerHook = () => {
  const timerStore = useTimerStore();
  const intervalRef = useRef<TimerId>(null);
  const timerEndedRef = useRef<boolean>(false);
  
  // Handle timer tick effect - this replaces the old useTimer hook logic
  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    // If timer should be running, start the interval
    if (timerStore.isRunning && !timerStore.isPaused) {
      timerEndedRef.current = false;
      
      intervalRef.current = setInterval(() => {
        // Update remainingTime and check for timer end
        timerStore.setRemainingTime((prevTime: number) => {
          const isInfinite = timerStore.sessionDurationMs === Number.MAX_SAFE_INTEGER;
          if (!isInfinite && prevTime <= 1000) {
            if (!timerEndedRef.current) {
              timerEndedRef.current = true;
              if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
              }
              
              // End the session
              setTimeout(() => timerStore.endSession(), 0);
              return 0;
            }
            return 0;
          }
          return prevTime - 1000;
        });
      }, 1000);
    }
    
    // Cleanup on unmount or state change
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [timerStore]);
  
  return timerStore;
};

export const useTimerStore = create<TimerState>()(
  persist(
    (set, get) => ({
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
      isRunning: false,
      
      // Simple actions
      setMinutes: (minutes) => set({ minutes }),
      setIsInfinite: (isInfinite) => set({ isInfinite }),
      setIsSessionActive: (isActive) => set({ isSessionActive: isActive }),
      setIsPaused: (isPaused) => set({ isPaused }),
      setCurrentGoal: (goal) => set({ currentGoal: goal }),
      setCurrentDifficulty: (difficulty) => set({ currentDifficulty: difficulty }),
      setSessionStartTime: (time) => set({ sessionStartTime: time }),
      setRemainingTime: (time) => {
        if (typeof time === 'function') {
          set((state) => ({ remainingTime: time(state.remainingTime) }));
        } else {
          set({ remainingTime: time });
        }
      },
      setDistractionCount: (count) => set({ distractionCount: count }),
      incrementDistractionCount: () => set((state) => ({ distractionCount: state.distractionCount + 1 })),
      setSessionDurationMs: (duration) => set({ sessionDurationMs: duration }),
      resetSession: () => set({
        isSessionActive: false,
        isPaused: false,
        isRunning: false,
        currentGoal: '',
        sessionStartTime: 0,
        remainingTime: 0,
        distractionCount: 0,
        sessionDurationMs: 0
      }),
      
      // Complex actions
      handleMinutesChange: (value) => {
        const state = get();
        if (state.isSessionActive) return;
        
        if (value === '∞') {
          set({ isInfinite: true, minutes: '' });
        } else {
          const num = parseInt(value);
          if (value === '' || (!isNaN(num) && num >= 0)) {
            set({ isInfinite: false, minutes: value });
          }
        }
      },
      
      handleGoalSet: (goal) => {
        set({ currentGoal: goal });
      },
      
      handleDifficultySet: (difficulty) => {
        set({ currentDifficulty: difficulty });
      },
      
      startSession: () => {
        const state = get();
        if (state.isSessionActive) return;
        
        const durationMinutes = state.isInfinite ? -1 : parseInt(state.minutes) || 0;
        if (!state.isInfinite && durationMinutes <= 0) {
          // Should show an alert but we'll leave that to the UI component
          return;
        }
        
        // Calculate duration in milliseconds
        const durationMs = state.isInfinite ? Number.MAX_SAFE_INTEGER : durationMinutes * 60 * 1000;
        const finalGoal = state.currentGoal.trim() || 'YOLO-MODE';
        
        // Play sound - moved to component for now
        // if (SFX && SFX.start) playSfx(SFX.start);
        
        // Update state
        set({
          sessionDurationMs: durationMs,
          currentGoal: finalGoal,
          sessionStartTime: Date.now(),
          remainingTime: durationMs,
          distractionCount: 0,
          isPaused: false,
          isSessionActive: true,
          isRunning: true
        });
        
        console.log(`[TimerStore] Starting Session: Goal='${finalGoal}', Duration=${durationMinutes}min (${durationMs}ms)`);
      },
      
      pauseTimer: () => {
        const state = get();
        if (state.isSessionActive && !state.isPaused) {
          // Play sound - moved to component for now
          // if (SFX && SFX.pause) playSfx(SFX.pause);
          
          set({ isPaused: true });
        }
      },
      
      resumeTimer: () => {
        const state = get();
        if (state.isSessionActive && state.isPaused) {
          // Play sound - moved to component for now
          // if (SFX && SFX.start) playSfx(SFX.start);
          
          set({ isPaused: false });
        }
      },
      
      stopTimer: () => {
        set({
          isRunning: false,
          isPaused: false,
        });
      },
      
      addDistraction: () => {
        const state = get();
        if (state.isSessionActive && !state.isPaused) {
          set(state => ({ distractionCount: state.distractionCount + 1 }));
        }
      },
      
      endSession: () => {
        const state = get();
        if (!state.isSessionActive) return;
        
        // Play sound - moved to component for now
        // if (SFX && SFX.done) playSfx(SFX.done);
        
        console.log(`[TimerStore] Ending session. Goal: '${state.currentGoal}', Distractions: ${state.distractionCount}`);
        
        // Update state to reflect session end
        set({
          isSessionActive: false,
          isPaused: false,
          isRunning: false,
          remainingTime: 0,
        });
        
        // Reset goal - commenting this out since we want to keep it for history
        // set({ currentGoal: '' });
        
        // Streak management needs to be done at the App level
        // History management needs to be done at the App level
      }
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