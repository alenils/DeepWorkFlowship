import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useGoalStore } from '@/store/goalSlice';
import { useMissionsStore, getMissionTotals } from '@/store/missionsSlice';
import { DIFFICULTY } from '@/constants';

//

export const GoalPanel: React.FC = () => {
  const { goal, startGoal, addProgress, resetGoal, hydrate, updateGoal } = useGoalStore();
  // Missions store (projects)
  const missions = useMissionsStore((s) => s.missions);
  const activeMissionId = useMissionsStore((s) => s.activeMissionId);
  const isSelectionLocked = useMissionsStore((s) => s.isSelectionLocked);
  const lockedMissionId = useMissionsStore((s) => s.lockedMissionId);
  const selectMission = useMissionsStore((s) => s.selectMission);
  const updateMission = useMissionsStore((s) => s.updateMission);
  const createMission = useMissionsStore((s) => s.createMission);

  const [what, setWhat] = useState('');
  const [why, setWhy] = useState('');
  const [how, setHow] = useState('');
  const [target, setTarget] = useState<number>(120);
  const [editing, setEditing] = useState(false);
  const whatInputRef = useRef<HTMLInputElement | null>(null);

  // Hydrate goal state from localStorage on mount
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Listen for session end progress events
  useEffect(() => {
    const onProgress = (e: Event) => {
      try {
        const ce = e as CustomEvent<{ durationMs?: number; minutes?: number }>;
        const minutes = typeof ce.detail?.minutes === 'number'
          ? Math.max(0, Math.floor(ce.detail.minutes))
          : Math.max(0, Math.round((ce.detail?.durationMs || 0) / 60000));
        if (minutes > 0) addProgress(minutes);
      } catch {}
    };
    window.addEventListener('goal:session-progress', onProgress as EventListener);
    return () => window.removeEventListener('goal:session-progress', onProgress as EventListener);
  }, [addProgress]);

  // Active mission + aggregated totals for display
  const activeMission = useMemo(() => (
    missions.find(m => m.id === activeMissionId && !m.archived) || null
  ), [missions, activeMissionId]);

  const missionTotals = useMemo(() => (
    activeMission ? getMissionTotals(activeMission) : null
  ), [activeMission]);

  // Segmented bar widths (same logic as MissionBoard)
  const barSegments = useMemo(() => {
    if (!activeMission) return null;
    const target = Math.max(1, activeMission.targetMinutes || 1);
    const easy = activeMission.byDifficulty[DIFFICULTY.EASY] || 0;
    const med = activeMission.byDifficulty[DIFFICULTY.MEDIUM] || 0;
    const hard = activeMission.byDifficulty[DIFFICULTY.HARD] || 0;
    const unk = activeMission.byDifficulty[DIFFICULTY.UNKNOWN] || 0;
    let remaining = 100;
    const pct = (v: number) => Math.min(remaining, Math.max(0, (v / target) * 100));
    const sEasy = (() => { const p = pct(easy); remaining -= p; return p; })();
    const sMed = (() => { const p = pct(med); remaining -= p; return p; })();
    const sHard = (() => { const p = pct(hard); remaining -= p; return p; })();
    const sUnk = (() => { const p = pct(unk); remaining -= p; return p; })();
    return { sEasy, sMed, sHard, sUnk };
  }, [activeMission]);

  const handleStart = () => {
    const t = Math.max(1, Math.floor(Number(target) || 0));
    if (!what.trim() || t <= 0) return;
    const title = what.trim();
    const whyTrim = why.trim();
    const howTrim = how.trim();
    // Ensure a corresponding Mission (Project) exists and is selected
    try {
      const current = missions.find((m) => m.id === activeMissionId && !m.archived) || null;
      if (current) {
        updateMission(current.id, { title, why: whyTrim, how: howTrim, targetMinutes: t });
        selectMission(current.id);
      } else {
        const existing = missions.find((m) => !m.archived && m.title.toLowerCase() === title.toLowerCase());
        if (existing) {
          updateMission(existing.id, { why: whyTrim, how: howTrim, targetMinutes: t });
          selectMission(existing.id);
        } else {
          const id = createMission({ title, why: whyTrim, how: howTrim, targetMinutes: t });
          selectMission(id);
        }
      }
    } catch {}
    // Start the goal after project setup so UI stays consistent
    startGoal({ what: title, why: whyTrim, how: howTrim, targetMinutes: t });
  };

  const handleReset = () => {
    resetGoal();
    setWhat('');
    setWhy('');
    setHow('');
    setTarget(120);
  };

  const handleStartEdit = () => {
    if (!goal) return;
    // ensure local state mirrors current goal when entering edit mode
    setWhat(goal.what || '');
    setWhy(goal.why || '');
    setHow(goal.how || '');
    setTarget(goal.targetMinutes || 0);
    setEditing(true);
  };

  const handleCancelEdit = () => {
    setEditing(false);
    // leave local state as-is; read-only view uses goal values
  };

  const handleSaveEdit = () => {
    const t = Math.max(1, Math.floor(Number(target) || 0));
    if (!what.trim() || t <= 0 || !goal) return;
    updateGoal({ what, why, how, targetMinutes: t });
    setEditing(false);
  };

  // Keep local form values in sync if a goal exists (read-only display)
  useEffect(() => {
    if (goal) {
      setWhat(goal.what || '');
      setWhy(goal.why || '');
      setHow(goal.how || '');
      setTarget(goal.targetMinutes || 0);
    }
  }, [goal]);

  return (
    <div className="space-y-4">
      {/* Project selector (Missions) */}
      <div className="grid grid-cols-1 gap-2">
        <div className="flex flex-col gap-2">
          <label className="text-xs text-gray-600 dark:text-gray-300">PROJECT</label>
          <div className="flex items-center gap-2">
            <select
              className="mission-input flex-1"
              value={activeMissionId || ''}
              onChange={(e) => selectMission(e.target.value || null)}
              disabled={isSelectionLocked}
            >
              <option value="">None</option>
              {missions.filter((m) => !m.archived).map((m) => (
                <option key={m.id} value={m.id}>{m.title}</option>
              ))}
            </select>
            <button
              type="button"
              disabled={isSelectionLocked}
              title={isSelectionLocked ? 'Locked during active session' : 'Create new project'}
              onClick={() => {
                if (isSelectionLocked) return;
                // Switch to inline form flow. If a goal exists, reset it so the form becomes visible.
                try { selectMission(null); } catch {}
                if (goal) {
                  // This clears goal and local fields via handleReset(), revealing the form
                  handleReset();
                } else {
                  // No active goal, just clear fields for a fresh project
                  setWhat('');
                  setWhy('');
                  setHow('');
                  setTarget(120);
                }
                // Make sure the Goal panel is expanded if it was collapsed
                try {
                  const panel = document.querySelector<HTMLElement>('[data-panel-id="goal"]');
                  panel?.dispatchEvent(new CustomEvent('inline-collapse:set', { detail: { collapsed: false }, bubbles: true }));
                } catch {}
                // Focus and bring the WHAT input into view after render
                setTimeout(() => {
                  const el = whatInputRef.current;
                  el?.focus();
                  el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 0);
              }}
              className={`px-2 py-2 rounded-md text-xs font-medium bg-white/40 dark:bg-gray-700/60 hover:bg-white/60 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-400 ${isSelectionLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              + New Project
            </button>
          </div>
          {isSelectionLocked && (
            <div className="text-[11px] text-violet-300">Locked during active session{lockedMissionId ? ` ("${missions.find(m=>m.id===lockedMissionId)?.title || 'Current'}")` : ''}</div>
          )}
          {missions.filter((m) => !m.archived).length === 0 && (
            <div className="text-xs text-gray-500 dark:text-gray-400">No projects yet. Create one below.</div>
          )}
        </div>
        {activeMission && barSegments && (
          <div className="mt-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-700 dark:text-gray-300">Project Progress</span>
              <span className="text-xs text-slate-400">
                {missionTotals?.total}/{activeMission.targetMinutes} min
                {missionTotals && missionTotals.overflow > 0 && (
                  <span className="ml-1 text-rose-400 font-medium">(+{missionTotals.overflow})</span>
                )}
              </span>
            </div>
            <div className="w-full h-2 rounded bg-black overflow-hidden flex" aria-label="Project progress">
              <div className="h-full bg-emerald-500 flex-none" style={{ width: `${barSegments.sEasy}%` }} />
              <div className="h-full bg-amber-500 flex-none" style={{ width: `${barSegments.sMed}%` }} />
              <div className="h-full bg-indigo-500 flex-none" style={{ width: `${barSegments.sHard}%` }} />
              <div className="h-full bg-gray-400/60 flex-none" style={{ width: `${barSegments.sUnk}%` }} />
            </div>
          </div>
        )}
      </div>
      {!goal && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <div className="text-[11px] uppercase tracking-wider text-gray-600 dark:text-gray-300 font-semibold">Mission Definition</div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs text-gray-600 dark:text-gray-300">WHAT</label>
            <input
              className="mission-input"
              placeholder="Define your mission"
              value={what}
              ref={whatInputRef}
              onChange={(e) => setWhat(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs text-gray-600 dark:text-gray-300">WHY</label>
            <input
              className="mission-input"
              placeholder="Why this matters"
              value={why}
              onChange={(e) => setWhy(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs text-gray-600 dark:text-gray-300">HOW</label>
            <input
              className="mission-input"
              placeholder="Your approach"
              value={how}
              onChange={(e) => setHow(e.target.value)}
            />
          </div>
          <div className="md:col-span-2 mt-1">
            <div className="text-[11px] uppercase tracking-wider text-gray-600 dark:text-gray-300 font-semibold">Target</div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs text-gray-600 dark:text-gray-300">TIME DEDICATED (minutes)</label>
            <input
              className="mission-input"
              type="number"
              min={1}
              value={target}
              onChange={(e) => setTarget(parseInt(e.target.value || '0', 10))}
            />
          </div>
          <div className="md:col-span-2 flex justify-end">
            <button
              type="button"
              onClick={handleStart}
              className="relative overflow-hidden btn-shimmer px-4 py-2 rounded-md text-sm font-semibold text-white bg-gradient-to-r from-violet-500 to-indigo-500 shadow-md hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-violet-400"
            >
              Start Goal
            </button>
          </div>
        </div>
      )}

      {goal && !editing && (
        <div className="space-y-4">
          {/* Removed goal progress bar from GoalPanel; progress visualization is on Mission Board */}

          {/* Slim read-only summary with clearer sectioning */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
            <div className="md:col-span-2">
              <div className="text-[11px] uppercase tracking-wider text-gray-600 dark:text-gray-300 font-semibold">Mission Details</div>
            </div>
            <div>
              <div className="text-[11px] text-gray-600 dark:text-gray-300">WHAT</div>
              <div className="text-sm text-gray-900 dark:text-gray-100 truncate" title={goal.what}>{goal.what}</div>
            </div>
            <div>
              <div className="text-[11px] text-gray-600 dark:text-gray-300">WHY</div>
              <div className="text-sm text-gray-900 dark:text-gray-100 truncate" title={goal.why}>{goal.why}</div>
            </div>
            <div>
              <div className="text-[11px] text-gray-600 dark:text-gray-300">HOW</div>
              <div className="text-sm text-gray-900 dark:text-gray-100 truncate" title={goal.how}>{goal.how}</div>
            </div>
            <div>
              <div className="text-[11px] text-gray-600 dark:text-gray-300">TIME DEDICATED</div>
              <div className="text-sm text-gray-900 dark:text-gray-100">{goal.targetMinutes} min</div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between gap-2">
            <button
              type="button"
              onClick={handleStartEdit}
              className="px-3 py-2 rounded-md text-sm font-medium text-orange-800 dark:text-orange-100 bg-white/40 dark:bg-gray-700/60 hover:bg-white/60 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
              title="Edit mission details without losing progress"
            >
              Mission Compromised
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="px-3 py-2 rounded-md text-sm font-medium text-gray-800 dark:text-gray-100 bg-white/40 dark:bg-gray-700/60 hover:bg-white/60 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              Reset Goal
            </button>
          </div>
        </div>
      )}

      {goal && editing && (
        <div className="space-y-4">
          {/* Editable form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-xs text-gray-600 dark:text-gray-300">WHAT</label>
              <input
                className="mission-input"
                placeholder="Define your mission"
                value={what}
                onChange={(e) => setWhat(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs text-gray-600 dark:text-gray-300">WHY</label>
              <input
                className="mission-input"
                placeholder="Why this matters"
                value={why}
                onChange={(e) => setWhy(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs text-gray-600 dark:text-gray-300">HOW</label>
              <input
                className="mission-input"
                placeholder="Your approach"
                value={how}
                onChange={(e) => setHow(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs text-gray-600 dark:text-gray-300">TIME DEDICATED (minutes)</label>
              <input
                className="mission-input"
                type="number"
                min={1}
                value={target}
                onChange={(e) => setTarget(parseInt(e.target.value || '0', 10))}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={handleCancelEdit}
              className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 bg-white/40 dark:bg-gray-700/60 hover:bg-white/60 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-400"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveEdit}
              className="relative overflow-hidden btn-shimmer px-4 py-2 rounded-md text-sm font-semibold text-white bg-gradient-to-r from-amber-500 to-orange-500 shadow-md hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              Save Changes
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoalPanel;
