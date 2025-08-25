import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useTimerStore } from '../store/timerSlice';
import { DIFFICULTY } from '../constants';
import { Zap, AudioWaveform, ChevronUp, ChevronDown, Play, Pause, Square, X, Loader2, Maximize2, Minimize2 } from 'lucide-react';
import { msToClock } from '../utils/time';
import { useFocusBoosterStore } from '../store/focusBoosterSlice';
import { useFortyHz } from '@/features/audio/useFortyHz';
//

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

// Map between HUD difficulty ids and store DIFFICULTY values
const mapSelectedToStore = (id: DifficultyId) => {
  switch (id) {
    case 'maintenance':
      return DIFFICULTY.EASY;
    case 'focus':
      return DIFFICULTY.MEDIUM;
    case 'deep':
      return DIFFICULTY.HARD;
  }
};

const mapStoreToSelected = (d: typeof DIFFICULTY[keyof typeof DIFFICULTY]): DifficultyId => {
  switch (d) {
    case DIFFICULTY.EASY:
      return 'maintenance';
    case DIFFICULTY.MEDIUM:
      return 'focus';
    case DIFFICULTY.HARD:
      return 'deep';
    default:
      return 'focus';
  }
};

export const FocusSessionTimer = ({ 
  isCompact: _isCompact = true,
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
    endSession,
    addDistraction
  } = useTimerStore();
  // Mission lock indicator removed from HUD per UX request
  
  const [missionBrief, setMissionBrief] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyId>(mapStoreToSelected(useTimerStore.getState().currentDifficulty));
  const [streakCount, setStreakCount] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [draftMinutes, setDraftMinutes] = useState(String(minutes));
  const wrapperRef = useRef<HTMLDivElement>(null);
  // Focus Booster arming state (1s build-up before activation)
  const [boosterArming, setBoosterArming] = useState(false);
  const boosterTimerRef = useRef<number | null>(null);

  // Fullscreen state tracking
  const [isFullscreen, setIsFullscreen] = useState(false);
  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    // initialize
    onFsChange();
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // Enhancers wiring
  const { status: boosterStatus, startBooster, exitBooster } = useFocusBoosterStore();
  const boosterActive = boosterStatus === 'active' || boosterStatus === 'finishing';
  const { isOn: is40HzOn, isLoading: is40HzLoading, toggle: toggle40Hz, stop: stop40Hz } = useFortyHz();
  
  // Subscribe to current difficulty in the store for RUNNING state coloring
  const currentDifficultyStore = useTimerStore((s) => s.currentDifficulty);
  const runningDifficulty = useMemo(() => mapStoreToSelected(currentDifficultyStore), [currentDifficultyStore]);

  // Load streak count for standalone mode
  useEffect(() => {
    if (asPanel) {
      const storedStreakCount = localStorage.getItem('totalStreakSessions');
      if (storedStreakCount) {
        setStreakCount(parseInt(storedStreakCount, 10));
      }
    }
  }, [asPanel]);

  // Ensure 40 Hz overlay is off when session is not active
  useEffect(() => {
    if (!isSessionActive && is40HzOn) {
      stop40Hz();
    }
  }, [isSessionActive, is40HzOn, stop40Hz]);

  // Ensure Focus Booster exits when session ends to avoid lingering overlay/state
  useEffect(() => {
    if (!isSessionActive && boosterActive) {
      exitBooster();
    }
    // Clear any pending arming timer when session ends
    if (!isSessionActive && boosterTimerRef.current) {
      clearTimeout(boosterTimerRef.current);
      boosterTimerRef.current = null;
      setBoosterArming(false);
    }
  }, [isSessionActive, boosterActive, exitBooster]);

  // Cleanup on unmount: clear pending arming timer
  useEffect(() => {
    return () => {
      if (boosterTimerRef.current) {
        clearTimeout(boosterTimerRef.current);
        boosterTimerRef.current = null;
      }
    };
  }, []);

  // Compute progress percentage for active sessions
  const progressPct = useMemo(() => {
    if (!isSessionActive || !remainingTime) return 0;
    const totalDuration = parseInt(minutes) * 60 * 1000; // minutes to ms
    const elapsed = Math.max(0, totalDuration - remainingTime);
    return Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
  }, [isSessionActive, remainingTime, minutes]);

  // Format time as mm:ss
  const formattedTime = useMemo(() => {
    const ms = Math.max(0, remainingTime ?? 0);
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }, [remainingTime]);

  // Keyboard shortcuts for active session
  useEffect(() => {
    if (!isSessionActive) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if in an input field
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }
      
      if (e.code === 'Space') {
        e.preventDefault();
        isPaused ? resumeTimer() : pauseTimer();
      } else if (e.key.toLowerCase() === 'd') {
        e.preventDefault();
        addDistraction();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSessionActive, isPaused, pauseTimer, resumeTimer, endSession, addDistraction]);

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

  const stepMinutes = (delta: number) => {
    setDraftMinutes((prev) => {
      const current = parseInt(prev || '0', 10);
      const next = clamp((Number.isNaN(current) ? 0 : current) + delta, 1, 600);
      // Immediately reflect stepped value in the store so LAUNCH enables and UI stays in sync
      handleMinutesChange(String(next));
      return String(next);
    });
  };

  const handleStart = () => {
    if (isSessionActive) return;
    // If editing, commit the draft (clamped) before starting so store minutes are correct
    if (isEditing) {
      commitDraft();
    }
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

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {}
  };

  const getDifficultyClasses = (difficulty: DifficultyId, isSelected: boolean) => {
    const baseClasses = "px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer min-h-[38px] flex items-center justify-center";
    
    if (isSelected) {
      switch (difficulty) {
        case 'maintenance':
          return `${baseClasses} bg-emerald-500/20 text-emerald-300 border border-emerald-500/40`;
        case 'focus':
          return `${baseClasses} bg-amber-500/20 text-amber-300 border border-amber-500/40`;
        case 'deep':
          return `${baseClasses} bg-violet-600/20 text-violet-300 border border-violet-500/45`;
      }
    }
    
    return `${baseClasses} bg-gray-700/50 text-gray-400 border border-gray-600/30 hover:bg-gray-600/50 focus:outline-none focus:ring-2 focus:ring-purple-500`;
  };

  // Map difficulty to digit color theme (text + glow)
  const getDigitTheme = (difficulty: DifficultyId) => {
    switch (difficulty) {
      case 'maintenance':
        return {
          textClass: 'text-emerald-300',
          dropShadowClass: 'drop-shadow-[0_0_18px_rgba(16,185,129,0.35)]',
          shadowRgba: 'rgba(16,185,129,0.35)'
        } as const;
      case 'focus':
        return {
          textClass: 'text-amber-300',
          dropShadowClass: 'drop-shadow-[0_0_18px_rgba(245,158,11,0.35)]',
          shadowRgba: 'rgba(245,158,11,0.35)'
        } as const;
      case 'deep':
      default:
        return {
          textClass: 'text-violet-300',
          dropShadowClass: 'drop-shadow-[0_0_18px_rgba(139,92,246,0.35)]',
          shadowRgba: 'rgba(139,92,246,0.35)'
        } as const;
    }
  };

  const idleDigitsTheme = useMemo(() => getDigitTheme(selectedDifficulty), [selectedDifficulty]);
  const runningDigitsTheme = useMemo(() => getDigitTheme(runningDifficulty), [runningDifficulty]);

  // Map difficulty to tone string for streak badge data attribute
  const getTone = (difficulty: DifficultyId): 'emerald' | 'amber' | 'violet' => {
    switch (difficulty) {
      case 'maintenance': return 'emerald';
      case 'focus': return 'amber';
      case 'deep':
      default: return 'violet';
    }
  };
  const toneForIdle = useMemo(() => getTone(selectedDifficulty), [selectedDifficulty]);
  const toneForRunning = useMemo(() => getTone(runningDifficulty), [runningDifficulty]);

  // Embedded mode: transparent wrapper, standalone mode: panel with frame
  const wrapperClasses = asPanel 
    ? 'panel-glass rounded-3xl p-4 md:p-5 relative' 
    : 'relative isolate w-full p-0 bg-transparent shadow-none border-0';

  return (
    <div className={wrapperClasses} ref={wrapperRef} data-compact={_isCompact ? 'true' : 'false'}>
      {/* Standalone mode header and streak badge (only when asPanel === true) */}
      {asPanel && (
        <>
          <div className="text-center mb-3">
            <h2 className="text-xl font-bold text-white">PRIMARY CONTROL INTERFACE</h2>
          </div>
          {streakCount > 0 && (
            <span className="absolute top-4 right-4 streak-badge btn-shimmer" data-tone={toneForIdle}>
              🔥 x{streakCount}
            </span>
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
              <div className="group relative rounded-xl p-[2px] transition-colors hover:ring-1 hover:ring-inset hover:ring-violet-400 focus-within:ring-2 focus-within:ring-inset focus-within:ring-violet-500">
                <input
                  type="text"
                  value={missionBrief}
                  onChange={(e) => setMissionBrief(e.target.value)}
                  placeholder="TASK"
                  aria-label="Task"
                  className="w-full px-4 pt-3.5 pb-2.5 bg-gray-800/50 border border-gray-600/30 rounded-xl text-white placeholder-gray-400 outline-none backdrop-blur-sm min-h-[38px] text-center hover:border-violet-400 focus:border-violet-400 transition-colors"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (isInfinite || minutes)) {
                      handleStart();
                    }
                  }}
                />
              </div>
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
                      onClick={() => {
                        setSelectedDifficulty(level.id);
                        // Push selection to the store so endSession saves correct difficulty
                        try {
                          useTimerStore.getState().handleDifficultySet(mapSelectedToStore(level.id));
                        } catch {}
                      }}
                      className={getDifficultyClasses(level.id, selectedDifficulty === level.id)}
                    >
                      {level.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* RIGHT: Open Digits (no frame), centered */}
              <div className="order-1 md:order-2 self-center">
                <div className="relative digit-glow mx-auto md:mx-auto text-center flex items-center justify-center">
                  {!isSessionActive && isEditing ? (
                    <>
                      <input
                        autoFocus
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={draftMinutes}
                        onChange={(e) => setDraftMinutes(e.target.value.replace(/[^\d]/g, ''))}
                        onBlur={commitDraft}
                        onWheel={(e) => e.currentTarget.blur()}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitDraft();
                          if (e.key === 'Escape') cancelEdit();
                          if (e.key === 'ArrowUp') { e.preventDefault(); stepMinutes(1); }
                          if (e.key === 'ArrowDown') { e.preventDefault(); stepMinutes(-1); }
                        }}
                        className={`relative z-10 w-28 bg-transparent text-center outline-none font-mono tabular-nums text-[56px] md:text-[72px] font-medium ${idleDigitsTheme.textClass} ${idleDigitsTheme.dropShadowClass} pr-6`}
                        aria-label="Edit timer minutes"
                      />
                      {/* Custom spinner controls with transparent background */}
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1 z-10 select-none pr-1">
                        <button
                          type="button"
                          onMouseDown={(e) => { e.preventDefault(); stepMinutes(1); }}
                          aria-label="Increase minutes"
                          className="h-5 w-5 p-0 bg-transparent text-gray-300 hover:text-white focus:outline-none"
                        >
                          <ChevronUp size={16} />
                        </button>
                        <button
                          type="button"
                          onMouseDown={(e) => { e.preventDefault(); stepMinutes(-1); }}
                          aria-label="Decrease minutes"
                          className="h-5 w-5 p-0 bg-transparent text-gray-300 hover:text-white focus:outline-none"
                        >
                          <ChevronDown size={16} />
                        </button>
                      </div>
                    </>
                  ) : (
                    <div
                      role="button"
                      tabIndex={0}
                      aria-label="Set minutes"
                      onClick={() => !isSessionActive && setIsEditing(true)}
                      onKeyDown={(e) => !isSessionActive && (e.key === 'Enter' || e.key === ' ') && setIsEditing(true)}
                      className={`relative z-10 font-mono tabular-nums text-[56px] md:text-[72px] font-medium ${idleDigitsTheme.textClass} ${idleDigitsTheme.dropShadowClass} ${!isSessionActive ? 'cursor-pointer' : ''}`}
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
              className="w-full light-speed-btn ls-active active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold px-8 py-3 rounded-lg transition-all duration-200 transform hover:scale-[1.02] min-h-[44px] focus:outline-none focus:ring-2 focus:ring-purple-400 text-lg"
              aria-label="Launch session"
            >
              LAUNCH
            </button>
          </>
        )}

        {/* RUNNING STATE */}
        {isSessionActive && (
          <div className={`hero-active ${isSessionActive && !isPaused ? 'is-running' : ''}`}>
            <div className="relative z-10 space-y-3">
              {/* HUD Bar - Centered TASK text, no 'Mission' label */}
              <div className="hud-bar">
                <div />
                <div className="hud-mission" title={currentGoal || missionBrief || 'TASK'}>
                  {currentGoal || missionBrief || 'TASK'}
                </div>
                <div className="hud-right">
                  {streakCount > 0 && (
                    <span className="streak-badge btn-shimmer" data-tone={toneForRunning} aria-label={`Streak ${streakCount}`}>
                      🔥 x{streakCount}
                    </span>
                  )}
                </div>
              </div>

              {/* Timer Face */}
              <div className="timer-face" aria-live="polite">
                <div
                  className={`timer-digits font-mono ${runningDigitsTheme.textClass}`}
                  style={{ textShadow: `0 0 24px ${runningDigitsTheme.shadowRgba}` }}
                >
                  {formattedTime}
                </div>
              </div>

              {/* Controls - icon-only, neutral */}
              <div className="controls">
                {/* Pause/Resume */}
                <button
                  type="button"
                  className="icon-btn icon-btn--neutral"
                  onClick={handlePauseClick}
                  aria-pressed={isPaused}
                  aria-label={isPaused ? 'Resume' : 'Pause'}
                  title={isPaused ? 'Resume' : 'Pause'}
                >
                  {isPaused ? <Play size={18} /> : <Pause size={18} />}
                </button>

                {/* Stop */}
                <button
                  type="button"
                  className="icon-btn icon-btn--neutral"
                  onClick={handleStop}
                  aria-label="Stop session"
                  title="Stop"
                >
                  <Square size={18} />
                </button>

                {/* Fullscreen */}
                <button
                  type="button"
                  className={`icon-btn ${isFullscreen ? 'icon-btn--on' : 'icon-btn--neutral'}`}
                  onClick={toggleFullscreen}
                  aria-pressed={isFullscreen}
                  aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                  title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                >
                  {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                </button>

                {/* Distracted (X) with badge */}
                <button
                  type="button"
                  className="icon-btn icon-btn--neutral relative"
                  onClick={addDistraction}
                  aria-label="Distracted"
                  title="MISSION TEMPORARILY COMPROMISED - DISTRACTING ARTIFACT HIT SPACESHIP - GETTING BACK ON COURSE"
                >
                  <X size={18} />
                  {distractionCount > 0 && (
                    <span className="icon-badge" aria-hidden="true">{distractionCount}</span>
                  )}
                </button>
              </div>

              {/* Enhancers Row - icon-only toggles */}
              <div className="flex justify-center gap-4 flex-wrap">
                {/* Focus Booster */}
                <button
                  onClick={() => {
                    if (boosterActive) {
                      // If already active, exit immediately and cancel any pending arming
                      if (boosterTimerRef.current) {
                        clearTimeout(boosterTimerRef.current);
                        boosterTimerRef.current = null;
                        setBoosterArming(false);
                      }
                      exitBooster();
                      return;
                    }
                    if (boosterArming) return; // ignore repeated clicks during buildup
                    setBoosterArming(true);
                    boosterTimerRef.current = window.setTimeout(() => {
                      startBooster();
                      setBoosterArming(false);
                      boosterTimerRef.current = null;
                    }, 1000);
                  }}
                  aria-pressed={boosterActive}
                  aria-busy={boosterArming}
                  disabled={boosterArming}
                  className={`icon-btn ${boosterActive ? 'icon-btn--on icon-btn--on-focus' : boosterArming ? 'icon-btn--arming-focus cursor-wait' : 'icon-btn--neutral'}`}
                  title="Focus Booster"
                >
                  <Zap size={18} />
                  <span className="sr-only">Focus Booster</span>
                </button>

                {/* 40 Hz */}
                <button
                  onClick={toggle40Hz}
                  aria-pressed={is40HzOn}
                  aria-busy={is40HzLoading}
                  disabled={is40HzLoading}
                  className={`icon-btn ${is40HzOn ? 'icon-btn--on icon-btn--on-40hz' : 'icon-btn--neutral'} ${is40HzLoading ? 'opacity-60 cursor-wait' : ''}`}
                  title="40 Hz"
                >
                  {is40HzLoading ? <Loader2 size={18} className="animate-spin" /> : <AudioWaveform size={18} />}
                  <span className="sr-only">40 Hz</span>
                </button>
              </div>

              {/* Progress Rail */}
              <div className="progress-wrap">
                <div className="progress-meta">
                  <span>Progress</span>
                  <span>{progressPct.toFixed(0)}%</span>
                </div>
                <div 
                  className="progress-rail" 
                  role="progressbar"
                  aria-valuemin={0} 
                  aria-valuemax={100} 
                  aria-valuenow={Math.round(progressPct)}
                >
                  <div className="progress-fill" style={{ width: `${progressPct}%` }} />
                  <div className="rocket" style={{ left: `${progressPct}%` }} aria-hidden="true"></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};