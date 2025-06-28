import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useEffect, useRef } from 'react';
import { useHistoryStore, generateId, SessionData, BreakData } from './historySlice';
import { useWarpStore } from './warpSlice';
import { 
  DEFAULT_TIMER_MINUTES, 
  TIMER_UPDATE_INTERVAL_MS, 
  DEFAULT_GOAL, 
  INFINITY_SYMBOL, 
  SESSION_TYPE, 
  DIFFICULTY,
  STORAGE_KEYS,
  MAX_DISTRACTIONS_FOR_STREAK
} from '../constants';

// TypeScript type for the timer ID
type TimerId = ReturnType<typeof setInterval> | null;

// Define our session difficulty types
type Difficulty = typeof DIFFICULTY[keyof typeof DIFFICULTY];

// Define the initial state for reuse in reset function and tests
export const initialTimerState = {
  minutes: DEFAULT_TIMER_MINUTES,
  isInfinite: false,
  isSessionActive: false,
  isPaused: false,
  currentGoal: '',
  currentDifficulty: DIFFICULTY.MEDIUM,
  sessionStartTime: 0,
  remainingTime: 0,
  distractionCount: 0,
  sessionDurationMs: 0,
  isRunning: false,
};

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
  
  // Reset function for testing
  reset: () => void;
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
          if (!isInfinite && prevTime <= TIMER_UPDATE_INTERVAL_MS) {
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
          return prevTime - TIMER_UPDATE_INTERVAL_MS;
        });
      }, TIMER_UPDATE_INTERVAL_MS);
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
      ...initialTimerState,
      
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
        
        if (value === INFINITY_SYMBOL) {
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
        const finalGoal = state.currentGoal.trim() || DEFAULT_GOAL;
        
        // Close any open break before starting a new session
        const historyStore = useHistoryStore.getState();
        historyStore.closeOpenBreak();
        
        // Use the new startSessionWarp function instead of triggerThrust
        const warpStore = useWarpStore.getState();
        warpStore.startSessionWarp();
        
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
        
        // Get historyStore access
        const historyStore = useHistoryStore.getState();
        
        console.log(`[TimerStore] Ending session. Goal: '${state.currentGoal}', Distractions: ${state.distractionCount}`);
        
        // Update timer state to reflect session end
        set({
          isSessionActive: false,
          isPaused: false,
          isRunning: false,
          remainingTime: 0,
        });
        
        // Trigger smooth deceleration in warp store
        const warpStore = useWarpStore.getState();
        warpStore.endSessionWarp();
        
        // Create session data for history
        const sessionData: SessionData = {
          type: SESSION_TYPE.FOCUS,
          id: generateId(),
          timestamp: Date.now() - state.sessionDurationMs, // Estimate start time from duration
          duration: state.sessionDurationMs,
          goal: state.currentGoal,
          distractions: state.distractionCount,
          posture: Math.round(Math.random() * 30 + 70), // Mock posture data for now
          difficulty: state.currentDifficulty,
          distractionLog: ''
        };
        
        // Create break data that starts now
        const breakData: BreakData = {
          type: SESSION_TYPE.BREAK,
          id: generateId(),
          start: Date.now(),
          end: null,
          durationMs: 0, // Will be calculated when break ends
          note: ""
        };
        
        // Update streak - reset if distractions >= MAX_DISTRACTIONS_FOR_STREAK, else increment
        if (state.distractionCount < MAX_DISTRACTIONS_FOR_STREAK) {
          historyStore.incrementStreakSessions();
        } else {
          historyStore.resetStreakSessions();
        }
        
        // First close any previously open break
        historyStore.closeOpenBreak();
        
        // Add session to history first, then the new break
        // This is crucial for the order in the history list, as items are prepended
        historyStore.addHistoryItem(sessionData);
        historyStore.addHistoryItem(breakData);
        
        // Set last session and show summary
        historyStore.setLastSession(sessionData);
        historyStore.setShowSummary(true);
      },
      
      // Reset function for testing
      reset: () => set(initialTimerState),
    }),
    {
      name: STORAGE_KEYS.TIMER, // localStorage key
      partialize: (state) => ({
        // Only persist these values in localStorage
        minutes: state.minutes,
        isInfinite: state.isInfinite,
      }),
    }
  )
); 