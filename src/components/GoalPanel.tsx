import React, { useEffect, useMemo, useState } from 'react';
import { useGoalStore } from '@/store/goalSlice';
import { useTimerStore } from '@/store/timerSlice';

const mmFmt = (mins: number) => `${Math.floor((mins || 0) / 60)}h ${String(Math.max(0, Math.floor(mins || 0)) % 60).padStart(2, '0')}m`;

export const GoalPanel: React.FC = () => {
  const { goal, startGoal, addProgress, resetGoal, hydrate } = useGoalStore();

  const [what, setWhat] = useState('');
  const [why, setWhy] = useState('');
  const [how, setHow] = useState('');
  const [target, setTarget] = useState<number>(120);

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

      {goal && (
        <div className="space-y-4">
          {/* Read-only summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex flex-col gap-1">
              <div className="text-xs text-gray-600 dark:text-gray-300">WHAT</div>
              <input className="mission-input" value={goal.what} disabled />
            </div>
            <div className="flex flex-col gap-1">
              <div className="text-xs text-gray-600 dark:text-gray-300">WHY</div>
              <input className="mission-input" value={goal.why} disabled />
            </div>
            <div className="flex flex-col gap-1">
              <div className="text-xs text-gray-600 dark:text-gray-300">HOW</div>
              <input className="mission-input" value={goal.how} disabled />
            </div>
            <div className="flex flex-col gap-1">
              <div className="text-xs text-gray-600 dark:text-gray-300">TIME DEDICATED</div>
              <input className="mission-input" value={`${goal.targetMinutes} min`} disabled />
            </div>
          </div>

          {/* Progress visuals */}
          <div className="space-y-1.5">
            {/* Labels */}
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>0 min</span>
              <span>{mmFmt(displayAccumulatedMinutes)} / {mmFmt(goal.targetMinutes)}</span>
              <span>{mmFmt(goal.targetMinutes)}</span>
            </div>

            {/* Track */}
            <div className="flight-track">
              <div className="flight-track__fill" style={{ ['--pct' as any]: `${pct}%` }} />
              <div
                className="flight-rocket absolute -top-4 select-none"
                style={{ left: `calc(${pct}% - 14px)` }}
                aria-hidden
              >
                🚀
              </div>
            </div>

            <div className="mt-2 text-xs text-slate-500">
              Status: {goal.completed ? 'Completed' : 'In progress'}
            </div>
          </div>

          <div className="flex justify-end">
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
    </div>
  );
};

export default GoalPanel;
