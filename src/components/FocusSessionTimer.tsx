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
  const [draftMinutes, setDraftMinutes] = useState(minutes.toString());
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

  const commitDraft = () => {
    const val = parseInt(draftMinutes, 10);
    if (!isNaN(val) && val > 0) {
      handleMinutesChange(val.toString());
    }
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
          return `${baseClasses} bg-indigo-500/20 text-indigo-300 border border-indigo-500/40`;
      }
    }
    
    return `${baseClasses} bg-gray-700/50 text-gray-400 border border-gray-600/30 hover:bg-gray-600/50 focus:outline-none focus:ring-2 focus:ring-purple-500`;
  };

  // Embedded mode: transparent wrapper, standalone mode: panel with frame
  const wrapperClasses = asPanel 
    ? 'panel-glass rounded-3xl p-6 relative' 
    : 'relative isolate w-full p-0 bg-transparent shadow-none border-0';

  return (
    <div className={wrapperClasses} ref={wrapperRef}>
      {/* Standalone mode header and streak badge (only when asPanel === true) */}
      {asPanel && (
        <>
          <div className="text-center mb-6">
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
      
      <div className="relative z-10 space-y-6">
        {/* IDLE STATE */}
        {!isSessionActive && (
          <>
            {/* Mission Brief Input */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">Mission Brief</label>
              <input
                type="text"
                value={missionBrief}
                onChange={(e) => setMissionBrief(e.target.value)}
                placeholder="What's the mission?"
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent backdrop-blur-sm min-h-[44px]"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && (isInfinite || minutes)) {
                    handleStart();
                  }
                }}
              />
            </div>

            {/* Monitor Bezel with Inline Editable Digits */}
            <div className="relative mx-auto rounded-2xl px-10 py-8 bg-gradient-to-b from-zinc-900/60 to-zinc-800/40 border border-indigo-500/30 shadow-inner text-center">
              {!isSessionActive && isEditing ? (
                <input
                  autoFocus
                  type="number"
                  value={draftMinutes}
                  onChange={(e) => setDraftMinutes(e.target.value)}
                  onBlur={commitDraft}
                  onKeyDown={(e) => e.key === 'Enter' && commitDraft()}
                  className="w-28 bg-transparent text-center outline-none font-mono tabular-nums text-[56px] md:text-[72px] font-medium text-white drop-shadow-[0_0_18px_rgba(168,85,247,0.35)]"
                  aria-label="Edit timer minutes"
                />
              ) : (
                <div
                  onClick={() => !isSessionActive && setIsEditing(true)}
                  className={`font-mono tabular-nums text-[56px] md:text-[72px] font-medium text-white drop-shadow-[0_0_18px_rgba(168,85,247,0.35)] ${!isSessionActive ? 'cursor-pointer' : ''}`}
                >
                  {isSessionActive ? msToClock(remainingTime) : `${minutes}:00`}
                </div>
              )}
              
              <div className="text-[0.7rem] font-mono uppercase tracking-[0.2em] text-purple-300/60 mt-2">
                {isSessionActive ? 'REMAINING' : 'DURATION CONTROL'}
              </div>
              
              {/* Scanlines */}
              <div className="pointer-events-none absolute inset-0 rounded-2xl overflow-hidden">
                <div className="h-full w-full bg-gradient-to-b from-transparent via-white/5 to-transparent opacity-20" />
              </div>
            </div>

            {/* LAUNCH Button */}
            <button
              onClick={handleStart}
              disabled={!isInfinite && !minutes}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold px-8 py-4 rounded-lg transition-all duration-200 transform hover:scale-[1.02] min-h-[44px] focus:outline-none focus:ring-2 focus:ring-purple-400 text-lg"
              aria-label="Launch session"
            >
              LAUNCH
            </button>

            {/* Difficulty Chips */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">Difficulty</label>
              <div className="flex gap-2 flex-wrap">
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

            {/* Monitor Bezel - Running State */}
            <div className="relative mx-auto rounded-2xl px-10 py-8 bg-gradient-to-b from-zinc-900/60 to-zinc-800/40 border border-indigo-500/30 shadow-inner text-center">
              <div className="font-mono tabular-nums text-[56px] md:text-[72px] font-medium text-white drop-shadow-[0_0_18px_rgba(168,85,247,0.35)]">
                {msToClock(remainingTime)}
              </div>
              
              <div className="text-[0.7rem] font-mono uppercase tracking-[0.2em] text-purple-300/60 mt-2">
                REMAINING
              </div>
              
              {/* Scanlines */}
              <div className="pointer-events-none absolute inset-0 rounded-2xl overflow-hidden">
                <div className="h-full w-full bg-gradient-to-b from-transparent via-white/5 to-transparent opacity-20" />
              </div>
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