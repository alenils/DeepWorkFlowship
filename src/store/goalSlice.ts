import { create } from 'zustand';

export type Goal = {
  what: string;
  why: string;
  how: string;
  targetMinutes: number;
  accumulatedMinutes: number;
  startedAt: number;
  locked: boolean;
  completed: boolean;
};

interface GoalState {
  goal: Goal | null;
  startGoal: (payload: { what: string; why: string; how: string; targetMinutes: number }) => void;
  addProgress: (minutes: number) => void;
  resetGoal: () => void;
  updateGoal: (payload: { what: string; why: string; how: string; targetMinutes: number }) => void;
  hydrate: () => void;
}

const STORAGE_KEY = 'goal:current';

function persistGoal(goal: Goal | null) {
  try {
    if (goal) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(goal));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {}
}

export const useGoalStore = create<GoalState>((set, get) => ({
  goal: null,

  startGoal: ({ what, why, how, targetMinutes }) => {
    const t = Math.max(1, Math.floor(targetMinutes || 0));
    const goal: Goal = {
      what: (what || '').trim(),
      why: (why || '').trim(),
      how: (how || '').trim(),
      targetMinutes: t,
      accumulatedMinutes: 0,
      startedAt: Date.now(),
      locked: true,
      completed: false,
    };
    set({ goal });
    persistGoal(goal);
  },

  addProgress: (minutes: number) => {
    const s = get();
    if (!s.goal) return;
    const add = Math.max(0, Math.floor(minutes || 0));
    if (add <= 0) return;
    const nextAccum = Math.min(s.goal.targetMinutes, (s.goal.accumulatedMinutes || 0) + add);
    const nextCompleted = nextAccum >= s.goal.targetMinutes;
    const goal: Goal = { ...s.goal, accumulatedMinutes: nextAccum, completed: nextCompleted };
    set({ goal });
    persistGoal(goal);
  },

  resetGoal: () => {
    set({ goal: null });
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  },

  updateGoal: ({ what, why, how, targetMinutes }) => {
    const s = get();
    if (!s.goal) return;
    const t = Math.max(1, Math.floor(targetMinutes || 0));
    const clampedAccum = Math.min(Math.max(0, s.goal.accumulatedMinutes || 0), t);
    const goal: Goal = {
      ...s.goal,
      what: (what || '').trim(),
      why: (why || '').trim(),
      how: (how || '').trim(),
      targetMinutes: t,
      accumulatedMinutes: clampedAccum,
      completed: clampedAccum >= t,
      // keep startedAt, locked as-is
    };
    set({ goal });
    persistGoal(goal);
  },

  hydrate: () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Goal;
      if (!parsed || typeof parsed.targetMinutes !== 'number') return;
      const goal: Goal = {
        what: parsed.what || '',
        why: parsed.why || '',
        how: parsed.how || '',
        targetMinutes: Math.max(1, Math.floor(parsed.targetMinutes)),
        accumulatedMinutes: Math.max(0, Math.floor(parsed.accumulatedMinutes || 0)),
        startedAt: parsed.startedAt || Date.now(),
        locked: typeof parsed.locked === 'boolean' ? parsed.locked : true,
        completed: typeof parsed.completed === 'boolean'
          ? parsed.completed
          : (parsed.accumulatedMinutes || 0) >= (parsed.targetMinutes || 1),
      };
      set({ goal });
    } catch {}
  },
}));
