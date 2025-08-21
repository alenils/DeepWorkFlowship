import { useState, useCallback, useEffect, useRef } from 'react';
import { useTimerStore } from '../store/timerSlice';
import { Zap, Pause, StopCircle, BrainCircuit } from 'lucide-react';
import { msToClock } from '../utils/time';
import { DistractionButton } from './DistractionButton';
import { TimerProgressBar } from './TimerProgressBar';

interface FocusSessionTimerProps {
  isCompact?: boolean;
  asPanel?: boolean;          // default false → embedded (no frame)
  embeddedRadiusPx?: number;  // default 16 → match hero rounded-2xl
  // Sound handlers will be passed from parent until we move sound logic to store
  onSessionStart?: () => void; // For playing sounds
  onPause?: () => void; // For playing sounds
  onResume?: () => void; // For playing sounds
  onTimerEnd?: () => void; // For playing sounds
}

const DIFFICULTY_LEVELS = [
  { id: 'maintenance', label: 'Routine', color: 'emerald' },
  { id: 'focus', label: 'Standard', color: 'amber' },
  { id: 'deep', label: 'Deep Focus', color: 'indigo' }
] as const;

type DifficultyId = typeof DIFFICULTY_LEVELS[number]['id'];

export const FocusSessionTimer = ({ 
  isCompact = true,
  asPanel = false,
  embeddedRadiusPx = 16,
  onSessionStart,
  onPause,
  onResume,
  onTimerEnd
}: FocusSessionTimerProps) => {
  // Get timer state and actions from the store
  const { 
    minutes, 
    isInfinite, 
    isSessionActive, 
    isPaused,
    currentGoal,
    distractionCount,
    remainingTime,
    handleMinutesChange,
    startSession,
    pauseTimer,
    resumeTimer,
    endSession
  } = useTimerStore();
  
  const [missionBrief, setMissionBrief] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyId>('focus');
  const [focusBoosterActive, setFocusBoosterActive] = useState(false);
  const [fortyHzActive, setFortyHzActive] = useState(false);
  const [streakCount, setStreakCount] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [draftMinutes, setDraftMinutes] = useState(String(minutes));
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Load streak count for standalone mode
  useEffect(() => {
    if (asPanel) {
      const storedStreakCount = localStorage.getItem('totalStreakSessions');
      if (storedStreakCount) {
        setStreakCount(parseInt(storedStreakCount, 10));
      }
    }
  }, [asPanel]);

  const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

  const commitDraft = () => {
    const val = parseInt(draftMinutes, 10);
    if (!Number.isNaN(val)) {
      const clamped = clamp(val, 1, 600); // 1..600 min (10 hours)
      handleMinutesChange(String(clamped));
    }
    setIsEditing(false);
  };

  const cancelEdit = () => {
    setDraftMinutes(String(minutes));
    setIsEditing(false);
  };

  const handleStart = () => {
    if (isSessionActive) return;
    startSession();
    if (onSessionStart) onSessionStart();
  };

  const handlePauseClick = useCallback(() => {
    if (!isSessionActive) return;
    
    if (isPaused) {
      resumeTimer();
      if (onResume) onResume();
    } else {
      pauseTimer();
      if (onPause) onPause();
    }
  }, [isSessionActive, isPaused, pauseTimer, resumeTimer, onPause, onResume]);

  const handleStop = () => {
    if (!isSessionActive) return;
    endSession();
    if (onTimerEnd) onTimerEnd();
  };

  const getDifficultyClasses = (difficulty: DifficultyId, isSelected: boolean) => {
    const baseClasses = "px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer min-h-[44px] flex items-center justify-center";
    
    if (isSelected) {
      switch (difficulty) {
        case 'maintenance':
          return `${baseClasses} bg-emerald-500/20 text-emerald-300 border border-emerald-500/40`;
        case 'focus':
          return `${baseClasses} bg-amber-500/20 text-amber-300 border border-amber-500/40`;
        case 'deep':
          return `${baseClasses} bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-[0_0_18px_rgba(168,85,247,0.35)] ring-1 ring-purple-300/60 border border-transparent hover:from-purple-500 hover:to-indigo-500`;
      }
    }
    
    return `${baseClasses} bg-gray-700/50 text-gray-400 border border-gray-600/30 hover:bg-gray-600/50 focus:outline-none focus:ring-2 focus:ring-purple-500`;
  };

  // Embedded mode: transparent wrapper, standalone mode: panel with frame
  const wrapperClasses = asPanel 
    ? 'panel-glass rounded-3xl p-4 md:p-5 relative' 
    : 'relative isolate w-full p-0 bg-transparent shadow-none border-0';

  return (
    <div className={wrapperClasses} ref={wrapperRef}>
      {/* Standalone mode header and streak badge (only when asPanel === true) */}
      {asPanel && (
        <>
          <div className="text-center mb-3">
            <h2 className="text-xl font-bold text-white">PRIMARY CONTROL INTERFACE</h2>
          </div>
          {streakCount > 0 && (
            <div className="absolute top-4 right-4 bg-gradient-to-br from-violet-500 via-fuchsia-500 to-indigo-500 text-white text-xs font-semibold px-2 py-1 rounded-lg">
              🔥 x{streakCount}
            </div>
          )}
        </>
      )}

      {/* Running Overlay - only for embedded mode */}
      {isSessionActive && !asPanel && (
        <div 
          className="absolute inset-0 bg-indigo-900/30 animate-pulse pointer-events-none transition-all duration-300 ease-out"
          style={{ borderRadius: `${embeddedRadiusPx}px` }}
        />
      )}
      
      <div className="relative z-10 space-y-3">
        {/* IDLE STATE */}
        {!isSessionActive && (
          <>
            {/* Mission Brief Input */}
            <div className="space-y-2 text-center">
              <input
                type="text"
                value={missionBrief}
                onChange={(e) => setMissionBrief(e.target.value)}
                placeholder="TASK"
                aria-label="Task"
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent backdrop-blur-sm min-h-[44px] text-center"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (isInfinite || minutes)) {
                    handleStart();
                  }
                }}
              />
            </div>

            {/* === Compact 2-column: Difficulty (left) + Monitor (right) === */}
            <div className="grid grid-cols-1 md:grid-cols-[minmax(160px,200px)_1fr] items-center md:items-center gap-3 md:gap-4">
              {/* LEFT: Difficulty */}
              <div className="order-2 md:order-1">
                {/* Vertical stack on desktop; wrap on mobile */}
                <div role="tablist" aria-label="Difficulty" className="flex md:flex-col gap-2 md:gap-2 justify-center md:justify-start">
                  {DIFFICULTY_LEVELS.map((level) => (
                    <button
                      key={level.id}
                      role="tab"
                      aria-selected={selectedDifficulty === level.id}
                      onClick={() => setSelectedDifficulty(level.id)}
                      className={getDifficultyClasses(level.id, selectedDifficulty === level.id)}
                    >
                      {level.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* RIGHT: Open Digits (no frame), centered */}
              <div className="order-1 md:order-2 self-center">
                <div className="relative mx-auto md:mx-auto text-center flex items-center justify-center">
                  {!isSessionActive && isEditing ? (
                    <input
                      autoFocus
                      type="number"
                      inputMode="numeric"
                      value={draftMinutes}
                      onChange={(e) => setDraftMinutes(e.target.value.replace(/[^\d]/g, ''))}
                      onBlur={commitDraft}
                      onWheel={(e) => e.currentTarget.blur()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitDraft();
                        if (e.key === 'Escape') cancelEdit();
                      }}
                      className="w-28 bg-transparent text-center outline-none font-mono tabular-nums text-[56px] md:text-[72px] font-medium text-white drop-shadow-[0_0_18px_rgba(168,85,247,0.35)]"
                      aria-label="Edit timer minutes"
                    />
                  ) : (
                    <div
                      role="button"
                      tabIndex={0}
                      aria-label="Set minutes"
                      onClick={() => !isSessionActive && setIsEditing(true)}
                      onKeyDown={(e) => !isSessionActive && (e.key === 'Enter' || e.key === ' ') && setIsEditing(true)}
                      className={`font-mono tabular-nums text-[56px] md:text-[72px] font-medium text-white drop-shadow-[0_0_18px_rgba(168,85,247,0.35)] ${!isSessionActive ? 'cursor-pointer' : ''}`}
                    >
                      {isSessionActive ? msToClock(remainingTime) : `${String(minutes).padStart(2, '0')}:00`}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* LAUNCH Button */}
            <button
              onClick={handleStart}
              disabled={!isInfinite && !minutes}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold px-8 py-3 rounded-lg transition-all duration-200 transform hover:scale-[1.02] min-h-[44px] focus:outline-none focus:ring-2 focus:ring-purple-400 text-lg"
              aria-label="Launch session"
            >
              LAUNCH
            </button>
          </>
        )}

        {/* RUNNING STATE */}
        {isSessionActive && (
          <>
            {/* Current Goal Display */}
            <div className="text-center space-y-2">
              <div className="text-sm text-gray-400">Current Goal</div>
              <div className="text-xl font-medium text-white">{currentGoal || missionBrief}</div>
            </div>

            {/* Open Digits - Running State (no frame) */}
            <div className="relative mx-auto text-center flex items-center justify-center">
              <div className="font-mono tabular-nums text-[56px] md:text-[72px] font-medium text-white drop-shadow-[0_0_18px_rgba(168,85,247,0.35)]">
                {msToClock(remainingTime)}
              </div>
            </div>

            <div className="text-[0.7rem] font-mono uppercase tracking-[0.2em] text-purple-300/60 -mt-1 text-center">
              REMAINING
            </div>

            {/* Controls Row */}
            <div className="flex justify-center gap-3 flex-wrap">
              <button
                onClick={handlePauseClick}
                className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors min-h-[44px] focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <Pause size={16} />
                {isPaused ? 'Resume' : 'Pause'}
              </button>
              
              <button
                onClick={handleStop}
                className="flex items-center gap-2 bg-red-700 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors min-h-[44px] focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <StopCircle size={16} />
                Stop
              </button>
              
              <DistractionButton className="min-h-[44px]" />
            </div>

            {/* Enhancers Row */}
            <div className="flex justify-center gap-4 flex-wrap">
              <button
                onClick={() => setFocusBoosterActive(!focusBoosterActive)}
                aria-pressed={focusBoosterActive}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all min-h-[44px] focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                  focusBoosterActive 
                    ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40' 
                    : 'bg-gray-700/50 text-gray-400 border border-gray-600/30 hover:bg-gray-600/50'
                }`}
              >
                <Zap size={16} />
                Focus Booster
              </button>
              
              <button
                onClick={() => setFortyHzActive(!fortyHzActive)}
                aria-pressed={fortyHzActive}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all min-h-[44px] focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                  fortyHzActive 
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40' 
                    : 'bg-gray-700/50 text-gray-400 border border-gray-600/30 hover:bg-gray-600/50'
                }`}
              >
                <BrainCircuit size={16} />
                40 Hz
              </button>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-400">
                <span>Progress</span>
                <span>Distractions: {distractionCount}</span>
              </div>
              <TimerProgressBar />
            </div>
          </>
        )}
      </div>
    </div>
  );
};