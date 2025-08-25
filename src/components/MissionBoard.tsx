import React, { useEffect, useRef } from 'react';
import InlineCollapsibleCard from './ui/InlineCollapsibleCard';
import { useInlineMinimize } from '../hooks/useInlineMinimize';
import { useMissionsStore, Mission, getMissionTotals } from '../store/missionsSlice';
import { DIFFICULTY } from '../constants';
import { Lock, AlertTriangle, Trash2, CheckCircle2, ArrowUp, ArrowDown } from 'lucide-react';
import { useTimerStore } from '../store/timerSlice';

export const MissionBoard: React.FC = () => {
  const { collapsed, toggle } = useInlineMinimize('mission-board', false);

  // Missions store
  const {
    missions,
    activeMissionId,
    isSelectionLocked,
    lockedMissionId,
    selectMission,
    archiveMission,
    safeDeleteMission,
    deleteMission,
    hydrateFromLegacyGoal,
    swapOrder,
    reorderVisible,
  } = useMissionsStore();

  // Hydrate from legacy goal if present (once)
  useEffect(() => {
    try { hydrateFromLegacyGoal(); } catch {}
  }, [hydrateFromLegacyGoal]);

  // Removed activeMission memo (no longer needed without lock banner)

  const handleSelect = (m: Mission) => {
    if (isSelectionLocked && m.id !== activeMissionId) return;
    selectMission(m.id);
  };

  // Select individual timer fields to keep snapshots stable
  const isSessionActive = useTimerStore((s) => s.isSessionActive);
  const isInfinite = useTimerStore((s) => s.isInfinite);
  const sessionDurationMs = useTimerStore((s) => s.sessionDurationMs);
  const remainingTime = useTimerStore((s) => s.remainingTime);
  const sessionStartTime = useTimerStore((s) => s.sessionStartTime);
  const currentDifficulty = useTimerStore((s) => s.currentDifficulty);
  const timerLockedMissionId = useTimerStore((s) => s.lockedMissionId);

  const renderSegmentedBar = (m: Mission) => {
    const target = Math.max(1, m.targetMinutes || 1);
    const easy = m.byDifficulty[DIFFICULTY.EASY] || 0;
    const med = m.byDifficulty[DIFFICULTY.MEDIUM] || 0;
    const hard = m.byDifficulty[DIFFICULTY.HARD] || 0;
    const unk = m.byDifficulty[DIFFICULTY.UNKNOWN] || 0;
    let remaining = 100;
    const pct = (v: number) => Math.min(remaining, Math.max(0, (v / target) * 100));
    const sEasy = (() => { const p = pct(easy); remaining -= p; return p; })();
    const sMed = (() => { const p = pct(med); remaining -= p; return p; })();
    const sHard = (() => { const p = pct(hard); remaining -= p; return p; })();
    const sUnk = (() => { const p = pct(unk); remaining -= p; return p; })();

    // Live overlay calculation for the currently locked mission during active session
    let overlayLeft = 0;
    let overlayWidth = 0;
    let overlayClass = '';
    const filledPct = sEasy + sMed + sHard + sUnk;
    if (isSessionActive && timerLockedMissionId === m.id) {
      const elapsedMs = isInfinite
        ? Math.max(0, Date.now() - sessionStartTime)
        : Math.max(0, sessionDurationMs - remainingTime);
      const liveMinutes = Math.max(0, elapsedMs / 60000);
      const completedMinutes = easy + med + hard + unk;
      const pendingMinutes = Math.max(0, Math.min(liveMinutes, Math.max(0, m.targetMinutes - completedMinutes)));
      const pendingPct = (pendingMinutes / target) * 100;
      overlayLeft = filledPct;
      overlayWidth = Math.max(0, Math.min(100 - filledPct, pendingPct));
      overlayClass =
        currentDifficulty === DIFFICULTY.EASY ? 'bg-emerald-500/70' :
        currentDifficulty === DIFFICULTY.MEDIUM ? 'bg-amber-500/70' :
        currentDifficulty === DIFFICULTY.HARD ? 'bg-indigo-500/70' : 'bg-gray-400/60';
    }

    return (
      <div className="relative w-full h-2 rounded bg-black overflow-hidden flex">
        <div className="h-full bg-emerald-500 flex-none" style={{ width: `${sEasy}%` }} />
        <div className="h-full bg-amber-500 flex-none" style={{ width: `${sMed}%` }} />
        <div className="h-full bg-indigo-500 flex-none" style={{ width: `${sHard}%` }} />
        <div className="h-full bg-gray-400/60 flex-none" style={{ width: `${sUnk}%` }} />
        {overlayWidth > 0 && (
          <div
            className={`absolute top-0 bottom-0 ${overlayClass}`}
            style={{ left: `${overlayLeft}%`, width: `${overlayWidth}%` }}
            aria-hidden
          />
        )}
      </div>
    );
  };

  // Special row: No Specific Project
  const NoProjectRow: React.FC = () => {
    const isActive = !activeMissionId;
    const lockedDifferent = isSelectionLocked && !isActive;
    return (
      <div
        className={`mission-row flex items-center gap-3 rounded-r border-l-2 pl-3 pr-2 py-2 text-[13px] transition-colors bg-[linear-gradient(90deg,rgba(139,135,255,0.02),rgba(139,135,255,0.05))] hover:bg-[rgba(139,135,255,0.08)] border-l-[rgba(139,135,255,0.25)] ${isActive ? 'border-l-violet-400' : 'hover:border-l-violet-400'} ${lockedDifferent ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
        aria-current={isActive ? 'true' : 'false'}
        role="button"
        aria-pressed={isActive}
        title={lockedDifferent ? 'Selection locked during active session' : (isActive ? 'Active: Unassigned Time!' : 'Switch to Unassigned Time!')}
        onClick={() => {
          if (lockedDifferent) return;
          try { selectMission(null); } catch {}
        }}
      >
        {/* Select radio for No Specific Project */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); if (!lockedDifferent) selectMission(null); }}
          disabled={lockedDifferent}
          aria-pressed={isActive}
          title={lockedDifferent ? 'Selection locked during active session' : (isActive ? 'Active: Unassigned Time!' : 'Select: Unassigned Time!')}
          className={`shrink-0 h-5 w-5 rounded-full border ${isActive ? 'border-violet-400 bg-violet-500/30' : 'border-gray-400/40 bg-transparent'} flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-violet-400`}
        >
          {isActive ? <CheckCircle2 size={14} className="text-violet-300" /> : <span className="block h-2 w-2 rounded-full bg-gray-400/60" />}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`truncate ${isActive ? 'text-gray-900 dark:text-gray-100' : 'text-gray-800 dark:text-gray-200'}`}>Unassigned Time!</span>
            {isSelectionLocked && lockedMissionId === null && (
              <span className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded bg-violet-600/15 text-violet-300 border border-violet-500/30" title="Locked during active session">
                <Lock size={12} />
                Locked
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  const visible = missions.filter(m => !m.archived);

  // DnD state
  const draggingIdRef = useRef<string | null>(null);

  const handleDropOnRow = (targetId: string, e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const draggedId = draggingIdRef.current;
    draggingIdRef.current = null;
    if (!draggedId || draggedId === targetId) return;
    const order = visible.map(v => v.id).filter(id => id !== draggedId);

    // Decide insert index by mouse position relative to row midpoint
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const before = e.clientY < rect.top + rect.height / 2;
    const targetIndex = order.indexOf(targetId);
    const insertAt = before ? targetIndex : targetIndex + 1;
    order.splice(insertAt, 0, draggedId);
    try { reorderVisible(order); } catch {}
  };

  const MissionRow = ({ m, aboveId, belowId }: { m: Mission; aboveId: string | null; belowId: string | null }) => {
    const { total, overflow } = getMissionTotals(m);
    const isActive = m.id === activeMissionId;
    const lockedDifferent = isSelectionLocked && !isActive;

    return (
      <div
        className={`mission-row flex items-center gap-3 rounded-r border-l-2 pl-3 pr-2 py-2 text-[13px] transition-colors bg-[linear-gradient(90deg,rgba(139,135,255,0.02),rgba(139,135,255,0.05))] hover:bg-[rgba(139,135,255,0.08)] border-l-[rgba(139,135,255,0.25)] ${isActive ? 'border-l-violet-400' : 'hover:border-l-violet-400'} ${lockedDifferent ? 'opacity-60 cursor-not-allowed' : 'cursor-grab'}`}
        aria-current={isActive ? 'true' : 'false'}
        draggable
        onDragStart={(e) => { 
          // Permit dragging regardless of selection lock
          draggingIdRef.current = m.id; 
          e.dataTransfer.effectAllowed = 'move';
          try { e.dataTransfer.setData('text/plain', m.id); } catch {}
        }}
        onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
        onDrop={(e) => handleDropOnRow(m.id, e)}
        onDragEnd={() => { draggingIdRef.current = null; }}
      >
        {/* Select radio */}
        <button
          type="button"
          onClick={() => handleSelect(m)}
          disabled={lockedDifferent}
          aria-pressed={isActive}
          title={lockedDifferent ? 'Selection locked during active session' : (isActive ? 'Active mission' : 'Select mission')}
          className={`shrink-0 h-5 w-5 rounded-full border ${isActive ? 'border-violet-400 bg-violet-500/30' : 'border-gray-400/40 bg-transparent'} flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-violet-400`}
        >
          {isActive ? <CheckCircle2 size={14} className="text-violet-300" /> : <span className="block h-2 w-2 rounded-full bg-gray-400/60" />}
        </button>

        {/* Title + progress */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`truncate ${isActive ? 'text-gray-900 dark:text-gray-100' : 'text-gray-800 dark:text-gray-200'}`}>{m.title}</span>
            {isSelectionLocked && lockedMissionId === m.id && (
              <span className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded bg-violet-600/15 text-violet-300 border border-violet-500/30" title="Locked during active session">
                <Lock size={12} />
                Locked
              </span>
            )}
            {overflow > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] px-1 py-0.5 rounded bg-rose-600/10 text-rose-400 border border-rose-500/30" title="Over mission target">
                <AlertTriangle size={12} />
                Over
              </span>
            )}
          </div>
          <div className="mt-1">{renderSegmentedBar(m)}</div>
          <div className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
            {total}/{m.targetMinutes} min
            {overflow > 0 && <span className="ml-1 text-rose-400 font-medium">(+{overflow})</span>}
          </div>
        </div>

        {/* Row actions */}
        <div className="flex items-center gap-1.5">
          {/* Reorder Up */}
          <button
            onClick={() => { if (aboveId) swapOrder(m.id, aboveId); }}
            disabled={!aboveId}
            className={`text-gray-400 hover:text-gray-200 dark:text-gray-500 dark:hover:text-gray-200 focus:outline-none ${!aboveId ? 'opacity-40 cursor-not-allowed' : ''}`}
            title="Move up"
            aria-label="Move up"
          >
            <ArrowUp size={16} />
          </button>
          {/* Reorder Down */}
          <button
            onClick={() => { if (belowId) swapOrder(m.id, belowId); }}
            disabled={!belowId}
            className={`text-gray-400 hover:text-gray-200 dark:text-gray-500 dark:hover:text-gray-200 focus:outline-none ${!belowId ? 'opacity-40 cursor-not-allowed' : ''}`}
            title="Move down"
            aria-label="Move down"
          >
            <ArrowDown size={16} />
          </button>
          <button
            onClick={() => {
              if (window.confirm('Mark this mission as finished? It will be archived.')) {
                archiveMission(m.id);
              }
            }}
            className="text-gray-400 hover:text-emerald-500 dark:text-gray-500 dark:hover:text-emerald-400 focus:outline-none"
            title="Mark as finished"
            aria-label="Mark as finished"
          >
            <CheckCircle2 size={16} />
          </button>
          <button
            onClick={() => {
              const ok = safeDeleteMission(m.id);
              if (!ok) {
                if (window.confirm('This mission has progress. Delete anyway? This cannot be undone.')) {
                  deleteMission(m.id);
                }
              }
            }}
            className="text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 focus:outline-none"
            title="Delete mission"
            aria-label="Delete mission"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <InlineCollapsibleCard
      id="mission-board"
      title="Mission Board"
      helpTitle="Select active mission and view progress (create/edit in Mission Goal panel)"
      onHelpClick={() => {}}
      collapsed={collapsed}
      onToggleCollapse={toggle}
      variant="v2"
      className="panel--no-pad panel-hover"
      contentClassName="content-pad-lg"
    >
      {/* Lock banner removed per UX request */}

      {/* List */}
      <div 
        className="space-y-1.5 max-h-[60vh] overflow-y-auto pr-1"
        onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
        onDrop={(e) => {
          e.preventDefault();
          const draggedId = draggingIdRef.current || ((): string | null => { try { return e.dataTransfer.getData('text/plain') || null; } catch { return null; } })();
          draggingIdRef.current = null;
          if (!draggedId) return;
          const order = visible.map(v => v.id).filter(id => id !== draggedId);
          order.push(draggedId);
          try { reorderVisible(order); } catch {}
        }}
      >
        {/* Special top entry for No Specific Project */}
        <NoProjectRow />
        {visible.length === 0 ? (
          <div className="text-xs text-gray-500 dark:text-gray-400 py-2">No missions yet.</div>
        ) : (
          visible.map((m, i) => (
            <MissionRow
              key={m.id}
              m={m}
              aboveId={i > 0 ? visible[i - 1].id : null}
              belowId={i < visible.length - 1 ? visible[i + 1].id : null}
            />
          ))
        )}
      </div>
    </InlineCollapsibleCard>
  );
}

export default MissionBoard;
