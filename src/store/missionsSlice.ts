import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DIFFICULTY, STORAGE_KEYS } from '../constants';

export type Difficulty = typeof DIFFICULTY[keyof typeof DIFFICULTY];

export interface Mission {
  id: string;
  title: string; // aka what
  why: string;
  how: string;
  targetMinutes: number;
  byDifficulty: Record<Difficulty, number>;
  archived: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface MissionsState {
  missions: Mission[];
  activeMissionId: string | null;
  // Selection locking during active focus sessions
  isSelectionLocked: boolean;
  lockedMissionId: string | null;

  // CRUD
  createMission: (payload: { title: string; why?: string; how?: string; targetMinutes: number }) => string;
  updateMission: (id: string, updates: Partial<Omit<Mission, 'id' | 'createdAt' | 'byDifficulty'>> & { targetMinutes?: number }) => void;
  archiveMission: (id: string) => void;
  unarchiveMission: (id: string) => void;
  resetProgress: (id: string) => void;
  safeDeleteMission: (id: string) => boolean; // returns success

  // Selection
  selectMission: (id: string | null) => void;
  lockSelection: (id?: string | null) => void;
  unlockSelection: () => void;

  // Progress
  addProgress: (id: string, minutes: number, difficulty: Difficulty) => void;

  // Migration
  hydrateFromLegacyGoal: () => void;

  // Helpers
  getActiveMission: () => Mission | null;
}

const nowTs = () => Date.now();
const genId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

function totalFor(m: Mission): number {
  return Object.values(m.byDifficulty).reduce((a, b) => a + (b || 0), 0);
}

export const useMissionsStore = create<MissionsState>()(
  persist(
    (set, get) => ({
      missions: [],
      activeMissionId: null,
      isSelectionLocked: false,
      lockedMissionId: null,

      createMission: ({ title, why = '', how = '', targetMinutes }) => {
        const t = Math.max(1, Math.floor(targetMinutes || 0));
        const id = genId();
        const ts = nowTs();
        const mission: Mission = {
          id,
          title: (title || '').trim(),
          why: (why || '').trim(),
          how: (how || '').trim(),
          targetMinutes: t,
          byDifficulty: {
            [DIFFICULTY.EASY]: 0,
            [DIFFICULTY.MEDIUM]: 0,
            [DIFFICULTY.HARD]: 0,
            [DIFFICULTY.UNKNOWN]: 0,
          },
          archived: false,
          createdAt: ts,
          updatedAt: ts,
        };
        set((s) => ({
          missions: [mission, ...s.missions],
          activeMissionId: s.activeMissionId ?? id,
        }));
        return id;
      },

      updateMission: (id, updates) => {
        set((s) => ({
          missions: s.missions.map((m) =>
            m.id === id
              ? {
                  ...m,
                  title: updates.title !== undefined ? (updates.title || '').trim() : m.title,
                  why: updates.why !== undefined ? (updates.why || '').trim() : m.why,
                  how: updates.how !== undefined ? (updates.how || '').trim() : m.how,
                  targetMinutes:
                    typeof updates.targetMinutes === 'number'
                      ? Math.max(1, Math.floor(updates.targetMinutes))
                      : m.targetMinutes,
                  archived: updates.archived ?? m.archived,
                  updatedAt: nowTs(),
                }
              : m
          ),
        }));
      },

      archiveMission: (id) => set((s) => ({
        missions: s.missions.map((m) => (m.id === id ? { ...m, archived: true, updatedAt: nowTs() } : m)),
        activeMissionId: s.activeMissionId === id ? null : s.activeMissionId,
      })),

      unarchiveMission: (id) => set((s) => ({
        missions: s.missions.map((m) => (m.id === id ? { ...m, archived: false, updatedAt: nowTs() } : m)),
      })),

      resetProgress: (id) => set((s) => ({
        missions: s.missions.map((m) =>
          m.id === id
            ? {
                ...m,
                byDifficulty: {
                  [DIFFICULTY.EASY]: 0,
                  [DIFFICULTY.MEDIUM]: 0,
                  [DIFFICULTY.HARD]: 0,
                  [DIFFICULTY.UNKNOWN]: 0,
                },
                updatedAt: nowTs(),
              }
            : m
        ),
      })),

      safeDeleteMission: (id) => {
        const s = get();
        const mission = s.missions.find((m) => m.id === id);
        if (!mission) return false;
        if (totalFor(mission) > 0) return false;
        set({
          missions: s.missions.filter((m) => m.id !== id),
          activeMissionId: s.activeMissionId === id ? null : s.activeMissionId,
        });
        return true;
      },

      selectMission: (id) => {
        const s = get();
        // Prevent changing selection when locked, unless it's the same id
        if (s.isSelectionLocked && id !== s.activeMissionId) return;
        set({ activeMissionId: id });
      },

      lockSelection: (id) => {
        const s = get();
        const lockId = id === undefined ? s.activeMissionId : id;
        set({ isSelectionLocked: true, lockedMissionId: lockId ?? null });
      },

      unlockSelection: () => set({ isSelectionLocked: false, lockedMissionId: null }),

      addProgress: (id, minutes, difficulty) => {
        const add = Math.max(0, Math.floor(minutes || 0));
        if (add <= 0) return;
        set((s) => ({
          missions: s.missions.map((m) => {
            if (m.id !== id) return m;
            const next = { ...m, byDifficulty: { ...m.byDifficulty } };
            next.byDifficulty[difficulty] = (next.byDifficulty[difficulty] || 0) + add;
            next.updatedAt = nowTs();
            return next;
          }),
        }));
      },

      hydrateFromLegacyGoal: () => {
        try {
          const s = get();
          if (s.missions.length > 0) return; // nothing to migrate into a non-empty store
          const raw = localStorage.getItem('goal:current');
          if (!raw) return;
          const parsed = JSON.parse(raw) as {
            what?: string;
            why?: string;
            how?: string;
            targetMinutes?: number;
            accumulatedMinutes?: number;
          };
          const t = Math.max(1, Math.floor(parsed?.targetMinutes || 0));
          const acc = Math.max(0, Math.floor(parsed?.accumulatedMinutes || 0));
          if (!t && !acc && !(parsed?.what || parsed?.why || parsed?.how)) return; // nothing useful
          const id = get().createMission({
            title: parsed?.what || 'Legacy Goal',
            why: parsed?.why || '',
            how: parsed?.how || '',
            targetMinutes: t || Math.max(1, acc || 60),
          });
          // Map legacy accumulated to UNKNOWN bucket
          get().addProgress(id, acc, DIFFICULTY.UNKNOWN);
        } catch (e) {
          console.warn('[missionsSlice] hydrateFromLegacyGoal failed', e);
        }
      },

      getActiveMission: () => {
        const s = get();
        if (!s.activeMissionId) return null;
        return s.missions.find((m) => m.id === s.activeMissionId) || null;
      },
    }),
    {
      name: STORAGE_KEYS.MISSIONS,
      partialize: (state) => ({
        missions: state.missions,
        activeMissionId: state.activeMissionId,
        // Do not persist lock state across reloads
      }),
    }
  )
);

// Utility helpers (non-state) for UI/selectors
export function getMissionTotals(m: Mission) {
  const total = totalFor(m);
  const pct = m.targetMinutes > 0 ? (total / m.targetMinutes) * 100 : 0;
  const overflow = Math.max(0, total - m.targetMinutes);
  return { total, pct, overflow };
}

export function willExceedWith(m: Mission, addMinutes: number) {
  const total = totalFor(m);
  const add = Math.max(0, Math.floor(addMinutes || 0));
  const willTotal = total + add;
  return willTotal > m.targetMinutes;
}
