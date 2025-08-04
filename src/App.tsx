import { useState, useEffect, useMemo, useRef } from 'react'
import { FocusSessionTimer } from './components/FocusSessionTimer'
import { DeepFocusInput } from './components/DeepFocusInput'
import { SessionSummaryPanel } from './components/SessionSummaryPanel'
import { SessionHistory } from './components/SessionHistory'
import { DistractionButton } from './components/DistractionButton'
import { DarkModeToggle } from './components/DarkModeToggle'
import { TimerProgressBar } from './components/TimerProgressBar'
import { useTimerHook, useTimerStore } from './store/timerSlice'
import { msToClock, formatTotalDuration } from './utils/time'
import { Notepad } from './components/Notepad'
import { ActionsList } from './components/ActionsList'
import { PostureView } from './components/PostureView'
import { Toast } from './components/Toast'
import { useSound } from './features/audio/useSound'
import { MusicPlayer } from './features/audio/MusicPlayer'
import { useHistoryStore, SessionData, BreakData, HistoryItem } from './store/historySlice'
import { useWarpStore } from './store/warpSlice'
import { StarfieldCanvas } from './components/starfield/StarfieldCanvas'
import { StarfieldControls } from './components/starfield/StarfieldControls'
import { FocusBooster } from './components/focusBooster/FocusBooster'
import { 
  SOUND_FILES, 
  WARP_MODE, 
  BAD_POSTURE_TIME_THRESHOLD_MS,
  ELEMENT_IDS,
  CSS_CLASSES,
  SESSION_TYPE
} from './constants'

// Type guards for history items
const isSessionData = (item: HistoryItem): item is SessionData => item.type === SESSION_TYPE.FOCUS;
const isBreakData = (item: HistoryItem): item is BreakData => item.type === SESSION_TYPE.BREAK;

function App() {
  // Sound effects
  const playStartSound = useSound(SOUND_FILES.START);
  const playPauseSound = useSound(SOUND_FILES.PAUSE);
  const playDoneSound = useSound(SOUND_FILES.DONE);
  const playCancelSound = useSound(SOUND_FILES.CANCEL);
  const playDistractionSound = useSound(SOUND_FILES.DISTRACTION);
  
  // Initialize the timer effects
  useTimerHook();
  
  // Get timer state from store when needed
  const { 
    isSessionActive, 
    isPaused,
    currentGoal,
    distractionCount,
    remainingTime,
    addDistraction
  } = useTimerStore();
  
  // Update browser tab title based on session status and remaining time
  useEffect(() => {
    const DEFAULT_TITLE = "FLOWSHIP.";
    
    if (isSessionActive && remainingTime > 0) {
      // Calculate minutes and seconds from remaining milliseconds
      const totalSeconds = Math.floor(remainingTime / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      
      // Format as MM:SS
      const newTitle = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')} - FLOWSHIP.`;
      console.log(`[App] Updating tab title: ${newTitle} (remainingTime: ${remainingTime}ms)`);
      document.title = newTitle;
    } else {
      console.log(`[App] Resetting tab title to default (isSessionActive: ${isSessionActive}, remainingTime: ${remainingTime}ms)`);
      document.title = DEFAULT_TITLE;
    }
    
    // Cleanup function to reset title when component unmounts
    return () => {
      document.title = DEFAULT_TITLE;
    };
  }, [isSessionActive, remainingTime]);
  
  // Get history state from store
  const {
    history,
    totalStreakSessions,
    lastSession, 
    showSummary,
    setTotalStreakSessions,
    setShowSummary,
    updateSessionItem,
    updateBreakNote,
    clearHistory
  } = useHistoryStore();
  
  // Get warp state from store
  const { warpMode, isThrusting } = useWarpStore();
  
  // Toast state
  const [toast, setToast] = useState({ show: false, message: '' });
  
  // Posture tracking state
  const [postureStatus, setPostureStatus] = useState<boolean>(true);
  const [badPostureStartTime, setBadPostureStartTime] = useState<number | null>(null);
  const badPostureTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Set up dark mode
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode === 'true' || 
        (!savedDarkMode && 
         window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    }
  }, []);
  
  // Handle posture status effect
  useEffect(() => {
    // Clear any existing timeout
    if (badPostureTimeoutRef.current) {
      clearTimeout(badPostureTimeoutRef.current);
      badPostureTimeoutRef.current = null;
    }
    
    if (!postureStatus) {
      // Start bad posture timer
      if (badPostureStartTime === null) {
        setBadPostureStartTime(Date.now());
      }
      
      // Set timeout to trigger nudge after threshold
      badPostureTimeoutRef.current = setTimeout(() => {
        // TODO: Play posture alert sound
        // TODO: Implement posture nudge
        console.log('Bad posture alert!');
      }, BAD_POSTURE_TIME_THRESHOLD_MS);
    } else {
      // Reset bad posture start time
      setBadPostureStartTime(null);
    }
    
    return () => {
      if (badPostureTimeoutRef.current) {
        clearTimeout(badPostureTimeoutRef.current);
      }
    };
  }, [postureStatus, badPostureStartTime]);
  
  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if in an input field
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }
      
      // Keyboard shortcuts
      switch (e.key) {
        case 'd':
          if (isSessionActive && !isPaused) {
            handleDistraction();
          }
          break;
          
        case 'w':
          if (e.ctrlKey || e.metaKey) break; // Skip browser shortcuts
          
          // Cycle through warp modes - now handled by warpStore
          const { setWarpMode } = useWarpStore.getState();
          // Toggle only between BACKGROUND and FULL modes when pressing 'w'
          setWarpMode(warpMode === WARP_MODE.BACKGROUND ? WARP_MODE.FULL : WARP_MODE.BACKGROUND);
          break;
          
        default:
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [warpMode, isSessionActive, isPaused]);
  
  // Show toast message
  const showToast = (message: string) => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: '' }), 3000);
  };
  
  // Handle warp distraction
  const handleWarpDistraction = () => {
    if (isSessionActive && !isPaused) {
      addDistraction();
      playDistractionSound();
      showToast("Distraction logged!");
    }
  };
  
  // Handle exit warp
  const handleExitWarp = () => {
    const { setWarpMode } = useWarpStore.getState();
    setWarpMode(WARP_MODE.NONE);
  };
  
  // Handle distraction button click
  const handleDistraction = () => {
    if (isSessionActive && !isPaused) {
      addDistraction();
      playDistractionSound();
      showToast("Distraction logged!");
    }
  };
  
  // Keep the handler for updating break notes - use historySlice
  const handleBreakNoteChange = (breakId: string, note: string) => {
    updateBreakNote(breakId, note);
  };

  // Keep handler for break note saving with Enter key
  const handleBreakNoteSave = (breakId: string, note: string) => {
    handleBreakNoteChange(breakId, note);
    showToast("Saved! Keep grinding.");
  };

  // Keep handler for clearing all history
  const handleClearHistory = () => {
    if (window.confirm('Are you sure you want to clear all session history and break notes?')) {
      playCancelSound();
      clearHistory();
    }
  };

  // Handle summary panel close with saved comment
  const handleSummaryClose = () => {
    if (lastSession) {
      // Update the session in history with the comment and distractions count
      updateSessionItem(lastSession.id, {
        comment: lastSession.comment,
        distractions: lastSession.distractions
      });
      
      // Show appropriate toast message
      showToast("Session saved!");
    } else {
      showToast("Saved!");
    }
    
    // Close the summary panel
    setShowSummary(false);
  };
  
  // Calculate total focus time
  const totalFocusTimeMs = useMemo(() => {
    return history.reduce((total, item) => {
      if (isSessionData(item)) {
        return total + item.duration;
      }
      return total;
    }, 0);
  }, [history]);
  
  // Calculate total break time
  const totalBreakTimeMs = useMemo(() => {
    return history.reduce((total, item) => {
      if (isBreakData(item) && item.end !== null) {
        return total + item.durationMs;
      }
      return total;
    }, 0);
  }, [history]);
  
  // Get glow class based on total streak sessions
  const getGlowClass = () => {
    if (totalStreakSessions >= 5) return 'shadow-lg';
    if (totalStreakSessions >= 3) return 'shadow-md';
    return 'shadow-sm';
  };

  return (
    // 1. New outermost container. Sets the true background color and stacking context. Applies shake effect.
    <div className={`relative isolate min-h-screen w-full h-full bg-gray-900 dark:bg-black ${isThrusting ? 'thrust-shake' : ''}`} 
         style={{ minHeight: '100vh' }}>
      
      {/* 2. Starfield Canvas is rendered first. It will sit at z-index: 0 by default. */}
      {(warpMode === WARP_MODE.BACKGROUND || warpMode === WARP_MODE.FULL) && <StarfieldCanvas />}

      {/* 3. Main UI Content Wrapper. It must have a HIGHER z-index and a TRANSPARENT background. */}
      <main className="relative z-10 max-w-6xl mx-auto p-6 min-h-screen flex flex-col bg-transparent">
        
        {/* DarkModeToggle (if it should be on top of starfield but not in full warp) */}
        {warpMode !== WARP_MODE.FULL && <DarkModeToggle />}

        {/* Grid Container */}
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-[345px_minmax(575px,1fr)_300px] flex-grow">
          {/* Left Column: The components inside here MUST have their own opaque backgrounds. */}
          <aside className="flex flex-col gap-6">
            <ActionsList />
            <Notepad />
            <StarfieldControls />
          </aside>
          
          {/* Middle Column: The components inside here MUST have their own opaque backgrounds. */}
          <div className="space-y-6 min-w-0">
            {/* Centered Main Title over middle column with Starfield button */}
            <div className="flex justify-center pt-2 pb-4 relative">
              <h1 className="text-4xl font-bold tracking-tight" style={{ color: 'white', textShadow: '0 0 1px white', letterSpacing: '-0.05em', WebkitTextStroke: '1px white' }}>FLOWSHIP.</h1>
            </div>
            
            {/* Focus Input and Timer Section */}
            <div className={`bg-white dark:bg-gray-800 rounded-lg p-6 relative
              ${totalStreakSessions > 0 ? 
                (isSessionActive 
                  ? `shadow-[color:var(--accent-cyan)] dark:shadow-[color:var(--accent-cyan)] ${getGlowClass()}` 
                  : `shadow-[color:var(--accent-green)] dark:shadow-[color:var(--accent-green)] ${getGlowClass()}`) 
                : 'shadow-lg'}`}
            >
              {/* Streak badge */}
              {totalStreakSessions > 0 && (
                <div 
                  className="absolute -top-2 -right-2 bg-[color:var(--accent-green)] text-white text-xs font-bold px-2 py-1 rounded-full shadow-md" 
                  title="Keep it under 3 distractions to grow your focus streak"
                >
                  🔥 x{totalStreakSessions}
                </div>
              )}
              
              <div className="flex flex-col md:flex-row items-start md:items-baseline space-y-4 md:space-y-0 md:space-x-4 mb-6">
                {/* Goal Input */} 
                <div className="flex-grow w-full md:w-auto">
                  <DeepFocusInput 
                    onStartSession={playStartSound}
                  />
                </div>
                {/* Timer Controls */}
                <div className="flex-shrink-0"> 
                  <FocusSessionTimer
                    onSessionStart={playStartSound}
                    onPause={playPauseSound}
                    onResume={playStartSound}
                    onTimerEnd={playDoneSound}
                    isCompact={true}
                  />
                </div>
              </div>

              {/* Session Progress Section */}
              {isSessionActive && (
                <div className="mt-6 p-4 bg-purple-50 dark:bg-deep-purple-900 rounded-lg space-y-3">
                  <div className="flex items-center justify-between space-x-4">
                    <div className="text-center">
                      <span className="text-deep-purple-800 dark:text-purple-200 font-medium block">Current Goal</span>
                      <span className="text-lg text-deep-purple-900 dark:text-purple-100">{currentGoal}</span>
                    </div>
                    <div className="flex-shrink-0">
                      <DistractionButton 
                        className={CSS_CLASSES.WARP_CONTROL_BUTTON}
                      />
                    </div>
                  </div>

                  <div className="flex justify-around items-center space-x-6">
                    <div className="text-center">
                      <span className="text-deep-purple-600 dark:text-purple-300 text-sm">Time Remaining</span>
                      <div className="text-2xl font-bold text-deep-purple-800 dark:text-purple-200">
                        {msToClock(remainingTime)}
                      </div>
                    </div>
                    <div className="text-center">
                      <span className="text-deep-purple-600 dark:text-purple-300 text-sm">Distractions</span>
                      <div className="text-2xl font-bold text-deep-purple-800 dark:text-purple-200">
                        {distractionCount}
                      </div>
                    </div>
                  </div>

                  <TimerProgressBar />
                </div>
              )}
            </div>

            {/* Session History Section */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700 relative">
              {/* Totals Section - Redesigned to keep box shape with underlying bar */}
              <div className="grid grid-cols-2 gap-3 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg mb-4">
                <div className="text-center p-2 bg-white dark:bg-gray-800 rounded shadow-sm relative overflow-hidden">
                  <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Total Focus</div>
                  <div className="text-xl font-bold text-gray-800 dark:text-gray-200 relative z-10">
                    {formatTotalDuration(totalFocusTimeMs)}
                  </div>
                  {/* Underlying Progress Bar */}
                  <div 
                    className="absolute bottom-0 left-0 h-[5px] bg-gradient-to-r from-deep-purple-500 to-green-500 transition-all duration-500 ease-out"
                    style={{ 
                      width: `${Math.min(100, (totalFocusTimeMs / (240 * 60 * 1000)) * 100)}%`
                    }}
                  ></div>
                </div>
                <div className="text-center p-2 bg-white dark:bg-gray-800 rounded shadow-sm relative overflow-hidden">
                  <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Total Break</div>
                  <div className="text-xl font-bold text-gray-800 dark:text-gray-200 relative z-10">
                    {formatTotalDuration(totalBreakTimeMs)}
                  </div>
                  {/* Underlying Progress Bar */}
                  <div 
                    className="absolute bottom-0 left-0 h-[5px] bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500 ease-out"
                    style={{ 
                      width: `${Math.min(100, (totalBreakTimeMs / (240 * 60 * 1000)) * 100)}%`
                    }}
                  ></div>
                </div>
              </div>
              
              <SessionHistory 
                history={history}
                onBreakNoteChange={handleBreakNoteChange}
                onBreakNoteSave={handleBreakNoteSave}
              /> 

              {history.length > 0 && ( 
                <div className="flex justify-center mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={handleClearHistory}
                    className="bg-deep-purple-600 text-white hover:bg-deep-purple-700 dark:bg-deep-purple-700 dark:hover:bg-deep-purple-800 px-3 py-1 rounded font-semibold transition-opacity dark:opacity-90 dark:hover:opacity-100 text-xs"
                    title="Clear all history and notes"
                  >
                    Clear All History
                  </button>
                </div>
              )}
            </div>
          </div>
          
          {/* Right Column: The components inside here MUST have their own opaque backgrounds. */}
          <aside className="space-y-6">
            <div className="mb-4">
              <PostureView 
                onPostureChange={setPostureStatus}
              />
            </div>
            <MusicPlayer 
              isSessionActive={isSessionActive} 
            />
          </aside>
        </div>
      </main>

      {/* Full Warp Controls (Positioned absolutely, will be above the canvas when z-index is high) */}
      {(warpMode === WARP_MODE.BACKGROUND || warpMode === WARP_MODE.FULL) && (
        <div id={ELEMENT_IDS.WARP_CONTROLS} className="absolute bottom-4 right-4 z-[10000] flex gap-3 items-center">
          <button
            id={ELEMENT_IDS.WARP_DISTRACT}
            onClick={handleWarpDistraction}
            className="bg-deep-purple-700/80 hover:bg-deep-purple-600/100 text-white font-semibold text-xs px-3 py-1.5 rounded-md backdrop-blur-sm transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-deep-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900/50 opacity-60 hover:opacity-100"
            title="Log distraction"
          >
            DISTRACTED
          </button>
          <button
            id={ELEMENT_IDS.EXIT_WARP}
            onClick={handleExitWarp}
            className="bg-deep-purple-700/80 hover:bg-deep-purple-600/100 text-white font-semibold text-xs px-3 py-1.5 rounded-md backdrop-blur-sm transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-deep-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900/50 opacity-60 hover:opacity-100"
            title="Exit warp"
          >
            EXIT WARP
          </button>
        </div>
      )}

      {/* Summary Panel */}
      {showSummary && lastSession && (
        <SessionSummaryPanel 
          isVisible={showSummary}
          sessionData={lastSession}
          streakCount={totalStreakSessions}
          onClose={handleSummaryClose}
          onStreakEnded={() => setTotalStreakSessions(0)}
        />
      )}
      
      {/* Toast */}
      <Toast 
        message={toast.message}
      />

      {/* Focus Booster */}
      <FocusBooster />
    </div>
  );
}

export default App; 