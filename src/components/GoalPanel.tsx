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
  const [creating, setCreating] = useState(false);
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
    setCreating(false);
  };

  const handleReset = () => {
    resetGoal();
    setWhat('');
    setWhy('');
    setHow('');
    setTarget(120);
  };

  const handleStartEdit = () => {
    const source = activeMission || (goal ? { title: goal.what, why: goal.why, how: goal.how, targetMinutes: goal.targetMinutes } as any : null);
    if (!source) return;
    // ensure local state mirrors current selection when entering edit mode
    setWhat(source.title || '');
    setWhy(source.why || '');
    setHow(source.how || '');
    setTarget(source.targetMinutes || 0);
    setEditing(true);
  };

  const handleCancelEdit = () => {
    setEditing(false);
    // leave local state as-is; read-only view uses goal values
  };

  const handleSaveEdit = () => {
    const t = Math.max(1, Math.floor(Number(target) || 0));
    if (!what.trim() || t <= 0) return;
    // Update selected mission if available
    if (activeMission) {
      try { updateMission(activeMission.id, { title: what.trim(), why: why.trim(), how: how.trim(), targetMinutes: t }); } catch {}
    }
    // Keep goal in sync if exists
    if (goal) {
      try { updateGoal({ what: what.trim(), why: why.trim(), how: how.trim(), targetMinutes: t }); } catch {}
    }
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

  // If a mission is selected elsewhere while creating, exit creation mode
  useEffect(() => {
    if (creating && activeMissionId) {
      setCreating(false);
    }
  }, [activeMissionId, creating]);

  return (
    <div className="space-y-4">
      {/* Project selector (Missions) */}
      <div className="grid grid-cols-1 gap-2">
        <div className="flex flex-col gap-2">
          <label className="text-xs text-gray-600 dark:text-gray-300">PROJECT</label>
          <div className="flex items-center gap-3">
            <select
              className="mission-input w-44 md:w-56 lg:w-64 p-2 text-sm"
              value={activeMissionId || ''}
              onChange={(e) => {
                setCreating(false);
                setEditing(false);
                selectMission(e.target.value || null);
              }}
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
                setCreating(true);
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
              className={`mission-input inline-flex items-center p-2 text-sm font-medium ${isSelectionLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              + New Project
            </button>
            {/* Icon actions moved here */}
            {!editing && !creating && (
              <button
                type="button"
                onClick={handleStartEdit}
                title="Edit mission details (Mission Compromised)"
                aria-label="Edit mission details"
                className="inline-flex items-center justify-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none"
              >
                {/* Bootstrap wrench icon */}
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                  <path d="M.102 2.223A3.004 3.004 0 0 0 3.78 5.897l6.341 6.252A3.003 3.003 0 0 0 13 16a3 3 0 1 0-.851-5.878L5.897 3.781A3.004 3.004 0 0 0 2.223.1l2.141 2.142L4 4l-1.757.364zm13.37 9.019.528.026.287.445.445.287.026.529L15 13l-.242.471-.026.529-.445.287-.287.445-.529.026L13 15l-.471-.242-.529-.026-.287-.445-.445-.287-.026-.529L11 13l.242-.471.026-.529.445-.287.287-.445.529-.026L13 11z"/>
                </svg>
              </button>
            )}
            {!editing && !creating && (
              <button
                type="button"
                onClick={handleReset}
                title="Reset goal"
                aria-label="Reset goal"
                className="inline-flex items-center justify-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none"
              >
                {/* Bootstrap arrow-counterclockwise icon */}
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M8 3a5 5 0 1 1-4.546 2.914.5.5 0 0 0-.908-.417A6 6 0 1 0 8 2z"/>
                  <path d="M8 4.466V.534a.25.25 0 0 0-.41-.192L5.23 2.308a.25.25 0 0 0 0 .384l2.36 1.966A.25.25 0 0 0 8 4.466"/>
                </svg>
              </button>
            )}
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
            <div className="flex items-center justify-between mb-4">
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
      {creating && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <div className="text-[11px] uppercase tracking-wider text-gray-600 dark:text-gray-300 font-semibold">Mission Definition</div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs text-gray-600 dark:text-gray-300">WHAT</label>
            <input
              className="mission-input font-mono text-[12px] leading-5 text-emerald-300/95 placeholder-emerald-500/50"
              placeholder="Define your mission"
              value={what}
              ref={whatInputRef}
              onChange={(e) => setWhat(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs text-gray-600 dark:text-gray-300">WHY</label>
            <input
              className="mission-input font-mono text-[12px] leading-5 text-emerald-300/95 placeholder-emerald-500/50"
              placeholder="Why this matters"
              value={why}
              onChange={(e) => setWhy(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs text-gray-600 dark:text-gray-300">HOW</label>
            <input
              className="mission-input font-mono text-[12px] leading-5 text-emerald-300/95 placeholder-emerald-500/50"
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
              className="mission-input font-mono text-[12px] leading-5 text-emerald-300/95 placeholder-emerald-500/50"
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

      {!editing && !creating && (activeMission || goal) && (
        <div className="space-y-4">
          {/* Removed goal progress bar from GoalPanel; progress visualization is on Mission Board */}

          {/* Slim read-only summary with normal typography */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
            <div className="md:col-span-2">
              <div className="text-xs uppercase tracking-wider text-gray-700 dark:text-gray-300 font-semibold">Mission Details</div>
            </div>
            <div>
              <div className="text-xs text-gray-600 dark:text-gray-300">WHAT</div>
              <div className="font-mono text-[12px] leading-5 text-emerald-300/95 truncate" title={(activeMission?.title || goal?.what) || ''}>{activeMission?.title || goal?.what}</div>
            </div>
            <div>
              <div className="text-xs text-gray-600 dark:text-gray-300">WHY</div>
              <div className="font-mono text-[12px] leading-5 text-emerald-300/95 truncate" title={(activeMission?.why || goal?.why) || ''}>{activeMission?.why || goal?.why}</div>
            </div>
            <div>
              <div className="text-xs text-gray-600 dark:text-gray-300">HOW</div>
              <div className="font-mono text-[12px] leading-5 text-emerald-300/95 truncate" title={(activeMission?.how || goal?.how) || ''}>{activeMission?.how || goal?.how}</div>
            </div>
            <div>
              <div className="text-xs text-gray-600 dark:text-gray-300">TIME DEDICATED</div>
              <div className="font-mono text-[12px] leading-5 text-emerald-300/95">{(activeMission?.targetMinutes || goal?.targetMinutes) ?? 0} min</div>
            </div>
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
                className="mission-input font-mono text-[12px] leading-5 text-emerald-300/95 placeholder-emerald-500/50"
                placeholder="Define your mission"
                value={what}
                onChange={(e) => setWhat(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs text-gray-600 dark:text-gray-300">WHY</label>
              <input
                className="mission-input font-mono text-[12px] leading-5 text-emerald-300/95 placeholder-emerald-500/50"
                placeholder="Why this matters"
                value={why}
                onChange={(e) => setWhy(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs text-gray-600 dark:text-gray-300">HOW</label>
              <input
                className="mission-input font-mono text-[12px] leading-5 text-emerald-300/95 placeholder-emerald-500/50"
                placeholder="Your approach"
                value={how}
                onChange={(e) => setHow(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs text-gray-600 dark:text-gray-300">TIME DEDICATED (minutes)</label>
              <input
                className="mission-input font-mono text-[12px] leading-5 text-emerald-300/95 placeholder-emerald-500/50"
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
