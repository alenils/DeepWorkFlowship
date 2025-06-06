import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  SESSION_TYPE, 
  DIFFICULTY, 
  STORAGE_KEYS 
} from '../constants';

// Session data interface with literal type
export interface SessionData {
  type: typeof SESSION_TYPE.FOCUS;
  id: string;
  timestamp: number;
  duration: number;
  goal: string;
  posture?: number;
  distractions: number;
  comment?: string;
  difficulty?: typeof DIFFICULTY[keyof typeof DIFFICULTY];
  distractionLog?: string;
}

// Break data interface with literal type
export interface BreakData {
  type: typeof SESSION_TYPE.BREAK;
  id: string;
  start: number;
  end: number | null;
  durationMs: number;
  note: string;
}

// Combined history item type
export type HistoryItem = SessionData | BreakData;

// Define the initial state for reuse in reset function and tests
export const initialHistoryState = {
  history: [] as HistoryItem[],
  totalStreakSessions: 0,
  lastSession: null as SessionData | null,
  showSummary: false,
};

// Generate a simple UUID for item IDs
export const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

// Type guard to check if an item is a session
export function isSessionData(item: HistoryItem): item is SessionData {
  return item.type === SESSION_TYPE.FOCUS;
}

// Type guard to check if an item is a break
export function isBreakData(item: HistoryItem): item is BreakData {
  return item.type === SESSION_TYPE.BREAK;
}

// Define our history store
export const useHistoryStore = create<{
  // State
  history: HistoryItem[];
  totalStreakSessions: number;
  lastSession: SessionData | null;
  showSummary: boolean;
  
  // Actions
  setHistory: (history: HistoryItem[]) => void;
  addHistoryItem: (item: HistoryItem) => void;
  updateSessionItem: (id: string, updates: Partial<Omit<SessionData, 'type' | 'id'>>) => void;
  updateBreakItem: (id: string, updates: Partial<Omit<BreakData, 'type' | 'id'>>) => void;
  closeOpenBreak: () => void;
  clearHistory: () => void;
  setTotalStreakSessions: (count: number) => void;
  incrementStreakSessions: () => void;
  resetStreakSessions: () => void;
  setLastSession: (session: SessionData | null) => void;
  setShowSummary: (show: boolean) => void;
  updateBreakNote: (breakId: string, note: string) => void;
  reset: () => void; // Reset function for testing
}>()(
  persist(
    (set) => ({
      // Initial state
      ...initialHistoryState,
      
      // Actions
      setHistory: (history) => set({ history }),
      
      addHistoryItem: (item) => set((state) => ({
        history: [item, ...state.history]
      })),
      
      updateSessionItem: (id, updates) => set((state) => ({
        history: state.history.map(item => 
          item.id === id && isSessionData(item) 
            ? { ...item, ...updates } 
            : item
        )
      })),
      
      updateBreakItem: (id, updates) => set((state) => ({
        history: state.history.map(item => 
          item.id === id && isBreakData(item) 
            ? { ...item, ...updates } 
            : item
        )
      })),
      
      closeOpenBreak: () => set((state) => {
        const newHistory = [...state.history];
        const openBreakIndex = newHistory.findIndex(
          item => isBreakData(item) && item.end === null
        );
        
        if (openBreakIndex !== -1) {
          const openBreak = newHistory[openBreakIndex] as BreakData;
          const endTime = Date.now();
          const calculatedDurationMs = endTime - openBreak.start;
          
          // Create a new break item with updated properties
          const updatedBreak: BreakData = {
            ...openBreak,
            end: endTime,
            durationMs: calculatedDurationMs
          };
          
          // Replace the item in the array
          newHistory[openBreakIndex] = updatedBreak;
          
          console.log(`[HistoryStore] Closed open break (ID: ${openBreak.id}). Duration: ${calculatedDurationMs}ms, Start: ${new Date(openBreak.start).toLocaleTimeString()}, End: ${new Date(endTime).toLocaleTimeString()}`);
        } else {
          console.log('[HistoryStore] No open break found to close');
        }
        
        return { history: newHistory };
      }),
      
      clearHistory: () => set({
        history: [],
        totalStreakSessions: 0,
      }),
      
      setTotalStreakSessions: (count) => set({ totalStreakSessions: count }),
      
      incrementStreakSessions: () => set((state) => ({
        totalStreakSessions: state.totalStreakSessions + 1
      })),
      
      resetStreakSessions: () => set({ totalStreakSessions: 0 }),
      
      setLastSession: (session) => set({ lastSession: session }),
      
      setShowSummary: (show) => set({ showSummary: show }),
      
      updateBreakNote: (breakId, note) => set((state) => ({
        history: state.history.map(item => 
          item.id === breakId && isBreakData(item) 
            ? { ...item, note } 
            : item
        )
      })),

      reset: () => set(initialHistoryState), // Reset function for testing
    }),
    {
      name: STORAGE_KEYS.HISTORY,
      partialize: (state) => ({
        history: state.history,
        totalStreakSessions: state.totalStreakSessions,
      }),
    }
  )
); 