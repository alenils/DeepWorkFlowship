import React, { useEffect, useMemo, useState } from 'react';
import { useGoalStore } from '@/store/goalSlice';
import { useTimerStore } from '@/store/timerSlice';

const mmFmt = (mins: number) => `${Math.floor((mins || 0) / 60)}h ${String(Math.max(0, Math.floor(mins || 0)) % 60).padStart(2, '0')}m`;

export const GoalPanel: React.FC = () => {
  const { goal, startGoal, addProgress, resetGoal, hydrate, updateGoal } = useGoalStore();

  const [what, setWhat] = useState('');
  const [why, setWhy] = useState('');
  const [how, setHow] = useState('');
  const [target, setTarget] = useState<number>(120);
  const [editing, setEditing] = useState(false);

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

  // Live timer state for continuous progress rendering (select primitives to avoid unstable snapshots)
  const isSessionActive = useTimerStore((s) => s.isSessionActive);
  const isPaused = useTimerStore((s) => s.isPaused);
  const isInfinite = useTimerStore((s) => s.isInfinite);
  const sessionDurationMs = useTimerStore((s) => s.sessionDurationMs);
  const remainingTime = useTimerStore((s) => s.remainingTime);
  const sessionStartTime = useTimerStore((s) => s.sessionStartTime);

  // Compute live in-session elapsed ms for display only (accumulation still happens on session end)
  const liveElapsedMs = useMemo(() => {
    if (!isSessionActive || isPaused) return 0;
    if (isInfinite) return Math.max(0, Date.now() - (sessionStartTime || Date.now()));
    const planned = Math.max(0, sessionDurationMs || 0);
    const rem = Math.max(0, remainingTime || 0);
    return Math.max(0, planned - rem);
  }, [isSessionActive, isPaused, isInfinite, sessionDurationMs, remainingTime, sessionStartTime]);

  const pct = useMemo(() => {
    if (!goal) return 0;
    const targetMs = Math.max(1, goal.targetMinutes) * 60000;
    const accumulatedMs = Math.max(0, goal.accumulatedMinutes) * 60000;
    const totalMsForDisplay = Math.min(targetMs, accumulatedMs + liveElapsedMs);
    return Math.max(0, Math.min(100, (totalMsForDisplay / targetMs) * 100));
  }, [goal, liveElapsedMs]);

  // Live accumulated minutes for display (does not mutate store)
  const displayAccumulatedMinutes = useMemo(() => {
    if (!goal) return 0;
    const liveMins = Math.floor(liveElapsedMs / 60000);
    return Math.min(goal.targetMinutes, goal.accumulatedMinutes + liveMins);
  }, [goal, liveElapsedMs]);

  const handleStart = () => {
    const t = Math.max(1, Math.floor(Number(target) || 0));
    if (!what.trim() || t <= 0) return;
    startGoal({ what, why, how, targetMinutes: t });
    // Emit Mission Board add event (decoupled)
    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('mission:add', { detail: { title: what.trim(), source: 'goal-panel' } })
        );
      }
    } catch {}
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
      {!goal && (
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
          {/* Progress on top, styled like Environment/Posture sliders (size only) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-700 dark:text-gray-300">Progress</span>
              <span className="text-xs text-slate-400">{mmFmt(displayAccumulatedMinutes)} / {mmFmt(goal.targetMinutes)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={Math.round(pct)}
              readOnly
              disabled
              aria-label="Goal progress"
              className="star-slider w-full h-2 rounded-lg appearance-none cursor-default disabled:opacity-100"
            />
          </div>

          {/* Slim read-only summary (text only, no input boxes) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
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
