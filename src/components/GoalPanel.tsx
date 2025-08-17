import React, { useEffect, useMemo, useState } from 'react';
import { useGoalStore } from '@/store/goalSlice';

function formatMinutesPretty(totalMinutes: number) {
  const m = Math.max(0, Math.floor(totalMinutes || 0));
  const h = Math.floor(m / 60);
  const mm = m % 60;
  const hPart = h > 0 ? `${h}h` : '';
  const mmStr = h > 0 ? String(mm).padStart(2, '0') : String(mm);
  const mPart = `${mmStr}m`;
  return hPart ? `${hPart} ${mPart}` : mPart;
}

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

          {/* Progress bar with rocket */}
          <div className="space-y-2">
            <div className="relative h-3 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-400 to-emerald-500"
                style={{ width: `${pct}%` }}
              />
              <div
                className="absolute -top-2 text-lg select-none"
                style={{ left: `${pct}%`, transform: 'translateX(-50%)' }}
                aria-hidden="true"
              >
                <span style={{ filter: 'drop-shadow(0 0 4px rgba(16,185,129,0.8))' }}>🚀</span>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm text-gray-700 dark:text-gray-300">
              <div>
                {formatMinutesPretty(goal.accumulatedMinutes)} / {formatMinutesPretty(goal.targetMinutes)}
              </div>
              <div className={`font-medium ${goal.completed ? 'text-emerald-600' : 'text-gray-600 dark:text-gray-400'}`}>
                {goal.completed ? 'Completed' : 'In progress'}
              </div>
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
