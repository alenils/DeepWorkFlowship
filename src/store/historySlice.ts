import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Session data interface with literal type
export interface SessionData {
  type: "session";
  id: string;
  timestamp: number;
  duration: number;
  goal: string;
  posture?: number;
  distractions: number;
  comment?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  distractionLog?: string;
}

// Break data interface with literal type
export interface BreakData {
  type: "break";
  id: string;
  start: number;
  end: number | null;
  durationMs: number;
  note: string;
}

// Combined history item type
export type HistoryItem = SessionData | BreakData;

// Generate a simple UUID for item IDs
export const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

// Type guard to check if an item is a session
function isSessionData(item: HistoryItem): item is SessionData {
  return item.type === 'session';
}

// Type guard to check if an item is a break
function isBreakData(item: HistoryItem): item is BreakData {
  return item.type === 'break';
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
}>()(
  persist(
    (set) => ({
      // Initial state
      history: [],
      totalStreakSessions: 0,
      lastSession: null,
      showSummary: false,
      
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
          
          console.log(`[HistoryStore] Closed open break. Duration: ${calculatedDurationMs}ms`);
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
    }),
    {
      name: 'deepwork-history-storage',
      partialize: (state) => ({
        history: state.history,
        totalStreakSessions: state.totalStreakSessions,
      }),
    }
  )
); 