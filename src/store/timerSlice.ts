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
  sessionEndTime: null as number | null,
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
  sessionEndTime: number | null; // New field for accurate background timing
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
  setSessionEndTime: (time: number | null) => void; // New setter
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
  tick: () => void; // New function to update timer based on real time
  
  // Reset function for testing
  reset: () => void;
}

// This function will be exported to allow components to use the timer
export const useTimerHook = () => {
  const timerStore = useTimerStore();
  const intervalRef = useRef<TimerId>(null);
  const timerEndedRef = useRef<boolean>(false);
  
  // Handle visibility change to update timer when tab becomes active
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && timerStore.isSessionActive && !timerStore.isPaused) {
        // When tab becomes visible again, trigger an immediate tick
        console.log('[TimerHook] Tab became visible, triggering immediate tick');
        timerStore.tick();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [timerStore]);
  
  // Handle timer tick effect - this replaces the old useTimer hook logic
  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    // If timer should be running, start the interval
    if (timerStore.isRunning && !timerStore.isPaused) {
      console.log('[TimerHook] Starting timer interval');
      timerEndedRef.current = false;
      
      // Initial tick to set the correct time immediately
      try {
        timerStore.tick();
      } catch (error) {
        console.error('[TimerHook] Error in initial tick:', error);
      }
      
      intervalRef.current = setInterval(() => {
        try {
          timerStore.tick();
        } catch (error) {
          console.error('[TimerHook] Error in timer tick:', error);
          // On error, clear the interval to prevent repeated errors
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        }
      }, TIMER_UPDATE_INTERVAL_MS);
    }
    
    // Cleanup on unmount or state change
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [timerStore.isRunning, timerStore.isPaused]);
  
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
      setSessionEndTime: (time) => set({ sessionEndTime: time }),
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
        sessionEndTime: null,
        remainingTime: 0,
        distractionCount: 0,
        sessionDurationMs: 0
      }),
      
      // New tick function for accurate timing
      tick: () => {
        const state = get();
        
        // Skip if not in active session or paused
        if (!state.isSessionActive || state.isPaused) return;
        
        // Handle infinite sessions differently
        if (state.isInfinite) {
          // For infinite sessions, just decrement by interval time
          // This keeps the timer running without an end condition
          const newTime = state.remainingTime - TIMER_UPDATE_INTERVAL_MS;
          console.log(`[TimerStore] Infinite tick: remainingTime=${newTime}`);
          set({ remainingTime: newTime });
          return;
        }
        
        // For finite sessions, calculate based on end time
        const { sessionEndTime } = state;
        
        // If no end time is set (should not happen for finite sessions), return
        if (sessionEndTime === null) {
          console.error('[TimerStore] Error: sessionEndTime is null for finite session');
          return;
        }
        
        // Calculate new remaining time based on current time and end time
        const now = Date.now();
        const newRemainingTime = Math.max(0, sessionEndTime - now);
        
        console.log(`[TimerStore] Finite tick: remainingTime=${newRemainingTime}, endTime=${sessionEndTime}, now=${now}`);
        
        // Update remaining time
        set({ remainingTime: newRemainingTime });
        
        // Check if timer is finished
        if (newRemainingTime <= 0) {
          // End the session
          console.log(`[TimerStore] Session finished`);
          setTimeout(() => get().endSession(), 0);
        }
      },
      
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
        
        const now = Date.now();
        const endTime = state.isInfinite ? null : (now + durationMs);
        
        console.log(`[TimerStore] Starting Session: Goal='${finalGoal}', Duration=${durationMinutes}min (${durationMs}ms)`);
        console.log(`[TimerStore] isInfinite=${state.isInfinite}, sessionEndTime=${endTime}`);
        
        // Update state
        set({
          sessionDurationMs: durationMs,
          currentGoal: finalGoal,
          sessionStartTime: now,
          sessionEndTime: endTime,
          remainingTime: durationMs,
          distractionCount: 0,
          isPaused: false,
          isSessionActive: true,
          isRunning: true
        });

        // Dispatch capture+collapse events for inline cards
        try {
          if (typeof window !== 'undefined') {
            // snapshot current expanded state BEFORE collapsing
            window.dispatchEvent(new Event('inline-collapse:capture'));
            // existing minimize-all
            window.dispatchEvent(new Event('inline-collapse:all'));
          }
        } catch (e) {
          console.warn('[TimerStore] Failed to dispatch inline-collapse events', e);
        }
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
          
          // Calculate new end time based on current time plus remaining time
          const newEndTime = Date.now() + state.remainingTime;
          
          set({ 
            isPaused: false,
            sessionEndTime: newEndTime,
            isRunning: true // Ensure timer is running when resuming
          });
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
          sessionEndTime: null,
        });
        
        // Trigger smooth deceleration in warp store
        const warpStore = useWarpStore.getState();
        warpStore.endSessionWarp();
        
        // Calculate actual session duration based on elapsed time
        const actualSessionStartTime = state.sessionStartTime || Date.now() - state.sessionDurationMs;
        const actualSessionDuration = state.sessionEndTime ? state.sessionDurationMs - state.remainingTime : Date.now() - actualSessionStartTime;
        
        // Create session data for history with actual duration
        const sessionData: SessionData = {
          type: SESSION_TYPE.FOCUS,
          id: generateId(),
          timestamp: actualSessionStartTime,
          duration: actualSessionDuration, // Use actual duration instead of planned duration
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

        // Restore panels to their pre-session expanded state
        try {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('inline-collapse:restore'));
          }
        } catch (e) {
          console.warn('[TimerStore] Failed to dispatch inline-collapse:restore event', e);
        }
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