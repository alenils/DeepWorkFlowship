import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useTimerStore, initialTimerState } from './timerSlice';
import { DEFAULT_GOAL, DIFFICULTY, INFINITY_SYMBOL } from '../constants';
import { act } from '@testing-library/react';

// Mock useHistoryStore
vi.mock('./historySlice', () => ({
  useHistoryStore: {
    getState: () => ({
      addHistoryItem: vi.fn(),
      closeOpenBreak: vi.fn(),
      incrementStreakSessions: vi.fn(),
      resetStreakSessions: vi.fn(),
      setLastSession: vi.fn(),
      setShowSummary: vi.fn(),
    }),
  },
  generateId: () => 'test-id',
}));

// Mock Date.now for consistent test values
const mockTimestamp = 1620000000000;
vi.spyOn(Date, 'now').mockImplementation(() => mockTimestamp);

describe('timerSlice', () => {
  // Reset the store before each test
  beforeEach(() => {
    act(() => {
      useTimerStore.getState().reset();
    });
  });
  
  it('should initialize with the correct default values', () => {
    const state = useTimerStore.getState();
    
    // Check if state matches initialTimerState
    expect(state.minutes).toBe(initialTimerState.minutes);
    expect(state.isInfinite).toBe(initialTimerState.isInfinite);
    expect(state.isSessionActive).toBe(initialTimerState.isSessionActive);
    expect(state.isPaused).toBe(initialTimerState.isPaused);
    expect(state.currentGoal).toBe(initialTimerState.currentGoal);
    expect(state.currentDifficulty).toBe(initialTimerState.currentDifficulty);
    expect(state.sessionStartTime).toBe(initialTimerState.sessionStartTime);
    expect(state.remainingTime).toBe(initialTimerState.remainingTime);
    expect(state.distractionCount).toBe(initialTimerState.distractionCount);
    expect(state.sessionDurationMs).toBe(initialTimerState.sessionDurationMs);
    expect(state.isRunning).toBe(initialTimerState.isRunning);
  });
  
  it('should handle minutes change correctly', () => {
    const { handleMinutesChange } = useTimerStore.getState();
    
    // Test setting a valid number
    act(() => {
      handleMinutesChange('30');
    });
    expect(useTimerStore.getState().minutes).toBe('30');
    expect(useTimerStore.getState().isInfinite).toBe(false);
    
    // Test setting to empty string
    act(() => {
      handleMinutesChange('');
    });
    expect(useTimerStore.getState().minutes).toBe('');
    expect(useTimerStore.getState().isInfinite).toBe(false);
    
    // Test setting to infinity symbol
    act(() => {
      handleMinutesChange(INFINITY_SYMBOL);
    });
    expect(useTimerStore.getState().minutes).toBe('');
    expect(useTimerStore.getState().isInfinite).toBe(true);
    
    // Test with invalid input (should not change)
    act(() => {
      handleMinutesChange('abc');
    });
    // State should remain unchanged from previous valid input
    expect(useTimerStore.getState().minutes).toBe('');
    expect(useTimerStore.getState().isInfinite).toBe(true);
  });
  
  it('should handle goal set correctly', () => {
    const { handleGoalSet } = useTimerStore.getState();
    const testGoal = 'Test Goal';
    
    // Initial goal should be empty
    expect(useTimerStore.getState().currentGoal).toBe('');
    
    // Set goal
    act(() => {
      handleGoalSet(testGoal);
    });
    expect(useTimerStore.getState().currentGoal).toBe(testGoal);
  });
  
  it('should handle difficulty set correctly', () => {
    const { handleDifficultySet } = useTimerStore.getState();
    
    // Initial difficulty should be MEDIUM
    expect(useTimerStore.getState().currentDifficulty).toBe(DIFFICULTY.MEDIUM);
    
    // Set to EASY
    act(() => {
      handleDifficultySet(DIFFICULTY.EASY);
    });
    expect(useTimerStore.getState().currentDifficulty).toBe(DIFFICULTY.EASY);
    
    // Set to HARD
    act(() => {
      handleDifficultySet(DIFFICULTY.HARD);
    });
    expect(useTimerStore.getState().currentDifficulty).toBe(DIFFICULTY.HARD);
    
    // Set back to MEDIUM
    act(() => {
      handleDifficultySet(DIFFICULTY.MEDIUM);
    });
    expect(useTimerStore.getState().currentDifficulty).toBe(DIFFICULTY.MEDIUM);
  });
  
  it('should start session correctly', () => {
    const { handleMinutesChange, handleGoalSet, startSession } = useTimerStore.getState();
    
    // Set up the timer
    act(() => {
      handleMinutesChange('25');
      handleGoalSet('Test Session');
    });
    
    // Start the session
    act(() => {
      startSession();
    });
    
    // Check if session started correctly
    const state = useTimerStore.getState();
    expect(state.isSessionActive).toBe(true);
    expect(state.isRunning).toBe(true);
    expect(state.isPaused).toBe(false);
    expect(state.currentGoal).toBe('Test Session');
    expect(state.sessionStartTime).toBe(mockTimestamp);
    expect(state.distractionCount).toBe(0);
    expect(state.sessionDurationMs).toBe(25 * 60 * 1000); // 25 minutes in ms
    expect(state.remainingTime).toBe(25 * 60 * 1000);
  });
  
  it('should start an infinite session correctly', () => {
    const { handleMinutesChange, handleGoalSet, startSession } = useTimerStore.getState();
    
    // Set up infinite timer
    act(() => {
      handleMinutesChange(INFINITY_SYMBOL);
      handleGoalSet('Infinite Session');
    });
    
    // Start the session
    act(() => {
      startSession();
    });
    
    // Check if infinite session started correctly
    const state = useTimerStore.getState();
    expect(state.isSessionActive).toBe(true);
    expect(state.isInfinite).toBe(true);
    expect(state.sessionDurationMs).toBe(Number.MAX_SAFE_INTEGER);
    expect(state.remainingTime).toBe(Number.MAX_SAFE_INTEGER);
  });
  
  it('should use default goal when empty', () => {
    const { handleMinutesChange, startSession } = useTimerStore.getState();
    
    // Set up the timer with no goal
    act(() => {
      handleMinutesChange('25');
    });
    
    // Start the session
    act(() => {
      startSession();
    });
    
    // Should use default goal
    expect(useTimerStore.getState().currentGoal).toBe(DEFAULT_GOAL);
  });
  
  it('should handle pause and resume correctly', () => {
    const { handleMinutesChange, startSession, pauseTimer, resumeTimer } = useTimerStore.getState();
    
    // Set up and start the timer
    act(() => {
      handleMinutesChange('25');
      startSession();
    });
    
    // Initially running
    expect(useTimerStore.getState().isPaused).toBe(false);
    
    // Pause the timer
    act(() => {
      pauseTimer();
    });
    expect(useTimerStore.getState().isPaused).toBe(true);
    
    // Resume the timer
    act(() => {
      resumeTimer();
    });
    expect(useTimerStore.getState().isPaused).toBe(false);
  });
  
  it('should add distractions correctly', () => {
    const { handleMinutesChange, startSession, addDistraction } = useTimerStore.getState();
    
    // Set up and start the timer
    act(() => {
      handleMinutesChange('25');
      startSession();
    });
    
    // Initially zero distractions
    expect(useTimerStore.getState().distractionCount).toBe(0);
    
    // Add a distraction
    act(() => {
      addDistraction();
    });
    expect(useTimerStore.getState().distractionCount).toBe(1);
    
    // Add another distraction
    act(() => {
      addDistraction();
    });
    expect(useTimerStore.getState().distractionCount).toBe(2);
  });
  
  it('should not add distractions when session is paused', () => {
    const { handleMinutesChange, startSession, pauseTimer, addDistraction } = useTimerStore.getState();
    
    // Set up, start, and pause the timer
    act(() => {
      handleMinutesChange('25');
      startSession();
      pauseTimer();
    });
    
    // Try to add a distraction
    act(() => {
      addDistraction();
    });
    
    // Distraction count should remain zero
    expect(useTimerStore.getState().distractionCount).toBe(0);
  });
  
  it('should reset session correctly', () => {
    const { handleMinutesChange, startSession, resetSession } = useTimerStore.getState();
    
    // Set up and start the timer
    act(() => {
      handleMinutesChange('25');
      startSession();
    });
    
    // Session is active
    expect(useTimerStore.getState().isSessionActive).toBe(true);
    
    // Reset the session
    act(() => {
      resetSession();
    });
    
    // Check if session was reset
    const state = useTimerStore.getState();
    expect(state.isSessionActive).toBe(false);
    expect(state.isPaused).toBe(false);
    expect(state.isRunning).toBe(false);
    expect(state.currentGoal).toBe('');
    expect(state.sessionStartTime).toBe(0);
    expect(state.remainingTime).toBe(0);
    expect(state.distractionCount).toBe(0);
    expect(state.sessionDurationMs).toBe(0);
    
    // Minutes should still be the same (persistent)
    expect(state.minutes).toBe('25');
  });
  
  it('should stop timer correctly', () => {
    const { handleMinutesChange, startSession, stopTimer } = useTimerStore.getState();
    
    // Set up and start the timer
    act(() => {
      handleMinutesChange('25');
      startSession();
    });
    
    // Timer is running
    expect(useTimerStore.getState().isRunning).toBe(true);
    
    // Stop the timer
    act(() => {
      stopTimer();
    });
    
    // Check if timer was stopped
    expect(useTimerStore.getState().isRunning).toBe(false);
    expect(useTimerStore.getState().isPaused).toBe(false);
    
    // Session is still active
    expect(useTimerStore.getState().isSessionActive).toBe(true);
  });
}); 