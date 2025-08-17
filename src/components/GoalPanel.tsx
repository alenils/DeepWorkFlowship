import React, { useEffect, useMemo, useState } from 'react';
import { useGoalStore } from '@/store/goalSlice';

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

  const pct = useMemo(() => {
    if (!goal) return 0;
    if (goal.targetMinutes <= 0) return 0;
    return Math.max(0, Math.min(100, (goal.accumulatedMinutes / goal.targetMinutes) * 100));
  }, [goal]);

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
              className="goalInput"
              placeholder="Define your mission"
              value={what}
              onChange={(e) => setWhat(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs text-gray-600 dark:text-gray-300">WHY</label>
            <input
              className="goalInput"
              placeholder="Why this matters"
              value={why}
              onChange={(e) => setWhy(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs text-gray-600 dark:text-gray-300">HOW</label>
            <input
              className="goalInput"
              placeholder="Your approach"
              value={how}
              onChange={(e) => setHow(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs text-gray-600 dark:text-gray-300">TIME DEDICATED (minutes)</label>
            <input
              className="goalInput"
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
              className="px-4 py-2 rounded-md text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-400"
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
              <input className="goalInput" value={goal.what} disabled />
            </div>
            <div className="flex flex-col gap-1">
              <div className="text-xs text-gray-600 dark:text-gray-300">WHY</div>
              <input className="goalInput" value={goal.why} disabled />
            </div>
            <div className="flex flex-col gap-1">
              <div className="text-xs text-gray-600 dark:text-gray-300">HOW</div>
              <input className="goalInput" value={goal.how} disabled />
            </div>
            <div className="flex flex-col gap-1">
              <div className="text-xs text-gray-600 dark:text-gray-300">TIME DEDICATED</div>
              <input className="goalInput" value={`${goal.targetMinutes} min`} disabled />
            </div>
          </div>

          {/* Progress visuals */}
          <div className="space-y-1.5">
            {/* Labels */}
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>0 min</span>
              <span>{mmFmt(goal.accumulatedMinutes)} / {mmFmt(goal.targetMinutes)}</span>
              <span>{mmFmt(goal.targetMinutes)}</span>
            </div>

            {/* Track */}
            <div className="relative h-2.5 rounded-full bg-slate-900/50 ring-1 ring-white/10 overflow-hidden">
              <div
                className="h-full transition-[width] duration-500 ease-out bg-gradient-to-r from-violet-500 via-fuchsia-500 to-emerald-400 shadow-[0_0_12px_rgba(168,85,247,.35)]"
                style={{ width: `${pct}%` }}
              />
              {/* Rocket */}
              <div
                className="absolute -top-4 will-change-transform"
                style={{ left: `calc(${pct}% - 14px)`, transition: 'left 300ms ease' }}
              >
                <span
                  className="select-none"
                  style={{ fontSize: 24, filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.6))' }}
                  aria-hidden
                >
                  🚀
                </span>
                <div
                  className="mx-auto -mt-1 h-1 w-10 rounded-full"
                  style={{
                    background:
                      'linear-gradient(90deg, rgba(255,255,255,0.0), rgba(168,85,247,0.5), rgba(59,130,246,0.0))',
                    filter: 'blur(2px)',
                    opacity: 0.7,
                  }}
                />
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
