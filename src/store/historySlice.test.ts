import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useHistoryStore, initialHistoryState, SessionData, BreakData } from './historySlice';
import { SESSION_TYPE, DIFFICULTY } from '../constants';
import { act } from '@testing-library/react';

// Mock Date.now() for consistent test values
const mockTimestamp = 1620000000000;
vi.spyOn(Date, 'now').mockImplementation(() => mockTimestamp);

// Skip mocking the UUID generator as it causes TypeScript errors
// We'll use fixed IDs in our tests instead

describe('historySlice', () => {
  // Reset the store before each test
  beforeEach(() => {
    act(() => {
      useHistoryStore.getState().reset();
    });
  });
  
  it('should initialize with the correct default values', () => {
    const state = useHistoryStore.getState();
    
    // Check if state matches initialHistoryState
    expect(state.history).toEqual(initialHistoryState.history);
    expect(state.totalStreakSessions).toBe(initialHistoryState.totalStreakSessions);
    expect(state.lastSession).toBe(initialHistoryState.lastSession);
    expect(state.showSummary).toBe(initialHistoryState.showSummary);
  });
  
  it('should add a history item correctly', () => {
    const { addHistoryItem } = useHistoryStore.getState();
    
    // Create a test session item
    const sessionItem: SessionData = {
      type: SESSION_TYPE.FOCUS,
      id: 'test-session',
      timestamp: mockTimestamp,
      duration: 1500000, // 25 minutes
      goal: 'Test Goal',
      distractions: 1,
      difficulty: DIFFICULTY.MEDIUM,
    };
    
    // Add the item to history
    act(() => {
      addHistoryItem(sessionItem);
    });
    
    // Check if item was added
    const history = useHistoryStore.getState().history;
    expect(history.length).toBe(1);
    expect(history[0]).toEqual(sessionItem);
  });
  
  it('should update session items correctly', () => {
    const { addHistoryItem, updateSessionItem } = useHistoryStore.getState();
    
    // Create and add a test session item
    const sessionItem: SessionData = {
      type: SESSION_TYPE.FOCUS,
      id: 'test-session',
      timestamp: mockTimestamp,
      duration: 1500000, // 25 minutes
      goal: 'Test Goal',
      distractions: 1,
      difficulty: DIFFICULTY.MEDIUM,
    };
    
    act(() => {
      addHistoryItem(sessionItem);
    });
    
    // Update the session item
    const updates = {
      distractions: 2,
      comment: 'Updated comment',
    };
    
    act(() => {
      updateSessionItem('test-session', updates);
    });
    
    // Check if item was updated
    const history = useHistoryStore.getState().history;
    expect(history[0].type).toBe(SESSION_TYPE.FOCUS);
    
    if (history[0].type === SESSION_TYPE.FOCUS) {
      expect(history[0].distractions).toBe(2);
      expect(history[0].comment).toBe('Updated comment');
      expect(history[0].goal).toBe('Test Goal'); // Unchanged properties remain
    }
  });
  
  it('should update break notes correctly', () => {
    const { addHistoryItem, updateBreakNote } = useHistoryStore.getState();
    
    // Create and add a test break item
    const breakItem: BreakData = {
      type: SESSION_TYPE.BREAK,
      id: 'test-break',
      start: mockTimestamp,
      end: mockTimestamp + 300000, // 5 minutes later
      durationMs: 300000,
      note: '',
    };
    
    act(() => {
      addHistoryItem(breakItem);
    });
    
    // Update the break note
    act(() => {
      updateBreakNote('test-break', 'Test break note');
    });
    
    // Check if note was updated
    const history = useHistoryStore.getState().history;
    expect(history[0].type).toBe(SESSION_TYPE.BREAK);
    
    if (history[0].type === SESSION_TYPE.BREAK) {
      expect(history[0].note).toBe('Test break note');
    }
  });
  
  it('should close open breaks correctly', () => {
    const { addHistoryItem, closeOpenBreak } = useHistoryStore.getState();
    
    // Create and add an open break (end is null)
    const breakItem: BreakData = {
      type: SESSION_TYPE.BREAK,
      id: 'test-break',
      start: mockTimestamp - 300000, // Started 5 minutes ago
      end: null, // Open break
      durationMs: 0, // Will be calculated when closed
      note: '',
    };
    
    act(() => {
      addHistoryItem(breakItem);
    });
    
    // Close the open break
    act(() => {
      closeOpenBreak();
    });
    
    // Check if break was closed correctly
    const history = useHistoryStore.getState().history;
    expect(history[0].type).toBe(SESSION_TYPE.BREAK);
    
    if (history[0].type === SESSION_TYPE.BREAK) {
      expect(history[0].end).toBe(mockTimestamp); // Should be set to current time
      expect(history[0].durationMs).toBe(300000); // Should be calculated
    }
  });
  
  it('should update streak sessions correctly', () => {
    const { incrementStreakSessions, resetStreakSessions } = useHistoryStore.getState();
    
    // Initially 0
    expect(useHistoryStore.getState().totalStreakSessions).toBe(0);
    
    // Increment streak
    act(() => {
      incrementStreakSessions();
    });
    expect(useHistoryStore.getState().totalStreakSessions).toBe(1);
    
    // Increment again
    act(() => {
      incrementStreakSessions();
    });
    expect(useHistoryStore.getState().totalStreakSessions).toBe(2);
    
    // Reset streak
    act(() => {
      resetStreakSessions();
    });
    expect(useHistoryStore.getState().totalStreakSessions).toBe(0);
  });
  
  it('should set and clear last session correctly', () => {
    const { setLastSession } = useHistoryStore.getState();
    
    // Initially null
    expect(useHistoryStore.getState().lastSession).toBe(null);
    
    // Set last session
    const sessionData: SessionData = {
      type: SESSION_TYPE.FOCUS,
      id: 'test-session',
      timestamp: mockTimestamp,
      duration: 1500000,
      goal: 'Test Goal',
      distractions: 1,
      difficulty: DIFFICULTY.MEDIUM,
    };
    
    act(() => {
      setLastSession(sessionData);
    });
    expect(useHistoryStore.getState().lastSession).toEqual(sessionData);
    
    // Clear last session
    act(() => {
      setLastSession(null);
    });
    expect(useHistoryStore.getState().lastSession).toBe(null);
  });
  
  it('should clear history correctly', () => {
    const { addHistoryItem, clearHistory, incrementStreakSessions } = useHistoryStore.getState();
    
    // Add a few items
    const sessionItem: SessionData = {
      type: SESSION_TYPE.FOCUS,
      id: 'test-session',
      timestamp: mockTimestamp,
      duration: 1500000,
      goal: 'Test Goal',
      distractions: 1,
      difficulty: DIFFICULTY.MEDIUM,
    };
    
    const breakItem: BreakData = {
      type: SESSION_TYPE.BREAK,
      id: 'test-break',
      start: mockTimestamp,
      end: mockTimestamp + 300000,
      durationMs: 300000,
      note: 'Test break',
    };
    
    act(() => {
      addHistoryItem(sessionItem);
      addHistoryItem(breakItem);
      incrementStreakSessions();
    });
    
    // Verify items were added
    expect(useHistoryStore.getState().history.length).toBe(2);
    expect(useHistoryStore.getState().totalStreakSessions).toBe(1);
    
    // Clear history
    act(() => {
      clearHistory();
    });
    
    // Verify history was cleared
    expect(useHistoryStore.getState().history.length).toBe(0);
    expect(useHistoryStore.getState().totalStreakSessions).toBe(0);
  });
}); 