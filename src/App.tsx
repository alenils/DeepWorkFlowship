import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
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
import { 
  SOUND_FILES, 
  WARP_ANIMATION, 
  WARP_MODE, 
  BAD_POSTURE_TIME_THRESHOLD_MS,
  STORAGE_KEYS,
  ELEMENT_IDS,
  CSS_CLASSES,
  SESSION_TYPE
} from './constants'

// Used TypeScript interfaces are imported from historySlice.ts now
// No need to redefine them here

// Type guards for history items
const isSessionData = (item: HistoryItem): item is SessionData => item.type === SESSION_TYPE.FOCUS;
const isBreakData = (item: HistoryItem): item is BreakData => item.type === SESSION_TYPE.BREAK;

// Warp mode types - Using the type from constants.ts values
type WarpMode = typeof WARP_MODE[keyof typeof WARP_MODE];

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
  
  // Toast state
  const [toast, setToast] = useState({ show: false, message: '' });
  
  // Warp state
  const [warpMode, setWarpMode] = useState<WarpMode>(WARP_MODE.NONE);
  const [warpSpeed] = useState(WARP_ANIMATION.DEFAULT_SPEED);
  const warpCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const warpAnimationFrameIdRef = useRef<number | null>(null);
  const warpStarsRef = useRef<Array<{x: number, y: number, z: number}>>([]);
  
  // Posture tracking state
  const [postureStatus, setPostureStatus] = useState<boolean>(true);
  const [badPostureStartTime, setBadPostureStartTime] = useState<number | null>(null);
  const badPostureTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Initialize warp stars
  const initWarpStars = useCallback((count: number) => {
    const stars = [];
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * window.innerWidth * 2 - window.innerWidth,
        y: Math.random() * window.innerHeight * 2 - window.innerHeight,
        z: Math.random() * WARP_ANIMATION.MAX_DEPTH
      });
    }
    warpStarsRef.current = stars;
  }, []);

  // Set warp mode
  const setWarpModeWithEffects = useCallback((mode: WarpMode) => {
    // Clean up existing warp if active
    if (warpMode !== WARP_MODE.NONE) {
      // Cancel animation
      if (warpAnimationFrameIdRef.current) {
        cancelAnimationFrame(warpAnimationFrameIdRef.current);
        warpAnimationFrameIdRef.current = null;
      }
      
      // Remove canvas
      if (warpCanvasRef.current) {
        document.body.removeChild(warpCanvasRef.current);
        warpCanvasRef.current = null;
      }
      
      document.body.classList.remove(CSS_CLASSES.BG_BLACK);
      document.body.style.overflow = '';
      
      // Remove any UI fading classes
      document.querySelectorAll(`.${CSS_CLASSES.WARP_DIMMED_TEXT}`).forEach(el => {
        el.classList.remove(CSS_CLASSES.OPACITY_70, CSS_CLASSES.WARP_DIMMED_TEXT);
      });
      document.querySelectorAll(`.${CSS_CLASSES.WARP_CONTROL_BUTTON}`).forEach(el => {
        el.classList.remove(CSS_CLASSES.OPACITY_50, CSS_CLASSES.WARP_FADED_BUTTON);
      });
      // Remove warp-dim class from minute input
      const minutesInput = document.getElementById(ELEMENT_IDS.MINUTES_INPUT);
      if (minutesInput) {
        minutesInput.classList.remove(CSS_CLASSES.WARP_DIM);
      }
    }
    
    // Set up new warp mode
    if (mode !== WARP_MODE.NONE) {
      const isFull = mode === WARP_MODE.FULL;
      
      // Create canvas with appropriate z-index and styling
      const canvas = document.createElement('canvas');
      canvas.id = isFull ? ELEMENT_IDS.WARP_FULL : ELEMENT_IDS.WARP_BG;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      
      if (isFull) {
        // Full warp
        document.body.classList.add(CSS_CLASSES.BG_BLACK);
        canvas.style.position = 'fixed';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.zIndex = '9999';
        canvas.style.opacity = '1';
        document.body.style.overflow = 'hidden';
      } else {
        // Background warp
        canvas.style.position = 'fixed';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.zIndex = '0';
        canvas.style.pointerEvents = 'none';
        canvas.style.opacity = '0.7';
        
        // Fade numeric text immediately
        document.querySelectorAll('.text-white, .dark\\:text-white, .text-gray-200, .dark\\:text-gray-200').forEach(el => {
          if (el.textContent && /[0-9]/.test(el.textContent)) {
            el.classList.add(CSS_CLASSES.OPACITY_70, CSS_CLASSES.WARP_DIMMED_TEXT);
          }
        });
        // Dim the minutes input immediately
        const minutesInput = document.getElementById(ELEMENT_IDS.MINUTES_INPUT);
        if (minutesInput) {
          minutesInput.classList.add(CSS_CLASSES.WARP_DIM);
        }
      }
      
      document.body.appendChild(canvas);
      warpCanvasRef.current = canvas;
      
      // Initialize stars (more stars for full warp)
      initWarpStars(isFull ? WARP_ANIMATION.STAR_COUNT : WARP_ANIMATION.STAR_COUNT_BG);
      
      // Start animation immediately
      animateWarpStars(warpSpeed);
    }
    
    // Update state and save to localStorage
    setWarpMode(mode);
    localStorage.setItem(STORAGE_KEYS.WARP_MODE, mode);
  }, [warpMode, initWarpStars, warpSpeed]);

  // Animate warp stars
  const animateWarpStars = useCallback((speedMultiplier = 1.0) => {
    if (!warpCanvasRef.current) return;
    
    const canvas = warpCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Update and draw stars
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    warpStarsRef.current.forEach((star) => {
      // Move star closer to viewer (faster with speedMultiplier)
      star.z -= 1 * speedMultiplier;
      
      // Reset star when it gets too close
      if (star.z <= 0) {
        star.z = WARP_ANIMATION.MAX_DEPTH;
        star.x = Math.random() * canvas.width * 2 - canvas.width;
        star.y = Math.random() * canvas.height * 2 - canvas.height;
      }
      
      // Project star position to 2D
      const factor = WARP_ANIMATION.MAX_DEPTH / (star.z || 1);
      const starX = star.x * factor + centerX;
      const starY = star.y * factor + centerY;
      
      // Only draw stars within canvas bounds
      if (starX >= 0 && starX <= canvas.width && starY >= 0 && starY <= canvas.height) {
        // Calculate size and color based on z-position
        const size = Math.max(0.5, (1 - star.z / WARP_ANIMATION.MAX_DEPTH) * 5);
        const alpha = 1 - star.z / WARP_ANIMATION.MAX_DEPTH;
        
        // Draw star
        ctx.beginPath();
        ctx.arc(starX, starY, size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.fill();
      }
    });
    
    // Request next frame
    warpAnimationFrameIdRef.current = requestAnimationFrame(() => animateWarpStars(speedMultiplier));
  }, []);

  // Update warp animation when browser window resizes
  useEffect(() => {
    const handleResize = () => {
      if (warpCanvasRef.current) {
        warpCanvasRef.current.width = window.innerWidth;
        warpCanvasRef.current.height = window.innerHeight;
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Set up dark mode
  useEffect(() => {
    const savedDarkMode = localStorage.getItem(STORAGE_KEYS.DARK_MODE);
    if (savedDarkMode === 'true' || 
        (!savedDarkMode && 
         window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    }
  }, []);
  
  // Set up warp mode
  useEffect(() => {
    const savedWarpMode = localStorage.getItem(STORAGE_KEYS.WARP_MODE) as WarpMode | null;
    if (savedWarpMode && savedWarpMode !== WARP_MODE.NONE) {
      setWarpModeWithEffects(savedWarpMode);
    }
  }, [setWarpModeWithEffects]);
  
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
          
          // Cycle through warp modes
          if (warpMode === WARP_MODE.NONE) {
            setWarpModeWithEffects(WARP_MODE.BACKGROUND);
          } else if (warpMode === WARP_MODE.BACKGROUND) {
            setWarpModeWithEffects(WARP_MODE.FULL);
          } else {
            setWarpModeWithEffects(WARP_MODE.NONE);
          }
          break;
          
        default:
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [warpMode, setWarpModeWithEffects, isSessionActive, isPaused]);
  
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
    setWarpModeWithEffects(WARP_MODE.NONE);
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      {warpMode !== WARP_MODE.FULL && <DarkModeToggle />}

      {/* FULL WARP Controls */}
      {(warpMode === WARP_MODE.BACKGROUND || warpMode === WARP_MODE.FULL) && (
        <div id={ELEMENT_IDS.WARP_CONTROLS} className="absolute bottom-4 right-4 z-[10000] flex gap-3 items-center">
          <button
            id={ELEMENT_IDS.WARP_DISTRACT}
            onClick={handleWarpDistraction}
            className="bg-red-700/80 hover:bg-red-600/100 text-white font-semibold text-xs px-3 py-1.5 rounded-md backdrop-blur-sm transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-900/50 opacity-60 hover:opacity-100"
            title="Log distraction"
          >
            DISTRACTED
          </button>
          <button
            id={ELEMENT_IDS.EXIT_WARP}
            onClick={handleExitWarp}
            className="bg-sky-700/80 hover:bg-sky-600/100 text-white font-semibold text-xs px-3 py-1.5 rounded-md backdrop-blur-sm transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-gray-900/50 opacity-60 hover:opacity-100"
            title="Exit warp"
          >
            EXIT WARP
          </button>
        </div>
      )}
      
      <div className="max-w-6xl mx-auto p-6">
        {/* Main layout grid - updated column widths */}
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-[345px_minmax(575px,1fr)_300px]">
          {/* Left Column: Actions (top) and Notepad (bottom) */}
          <aside className="flex flex-col gap-6">
            <ActionsList />
            <Notepad />
          </aside>
          
          {/* Middle Column: Timer & Session History */}
          <div className="space-y-6 min-w-0">
            {/* Centered Main Title over middle column with Starfield button */}
            <div className="flex justify-center pt-2 pb-4 relative">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">DEEP WORK: ULTIMATE DASHBOARD</h1>
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
                <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900 rounded-lg space-y-3">
                  <div className="flex items-center justify-between space-x-4">
                    <div className="text-center">
                      <span className="text-blue-800 dark:text-blue-200 font-medium block">Current Goal</span>
                      <span className="text-lg text-blue-900 dark:text-blue-100">{currentGoal}</span>
                    </div>
                    <div className="flex-shrink-0">
                      <DistractionButton 
                        className={CSS_CLASSES.WARP_CONTROL_BUTTON}
                      />
                    </div>
                  </div>

                  <div className="flex justify-around items-center space-x-6">
                    <div className="text-center">
                      <span className="text-blue-600 dark:text-blue-300 text-sm">Time Remaining</span>
                      <div className="text-2xl font-bold text-blue-800 dark:text-blue-200">
                        {msToClock(remainingTime)}
                      </div>
                    </div>
                    <div className="text-center">
                      <span className="text-blue-600 dark:text-blue-300 text-sm">Distractions</span>
                      <div className="text-2xl font-bold text-blue-800 dark:text-blue-200">
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
                    className="absolute bottom-0 left-0 h-[5px] bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500 ease-out"
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
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded font-semibold transition-opacity dark:opacity-90 dark:hover:opacity-100 text-xs"
                    title="Clear all history and notes"
                  >
                    Clear All History
                  </button>
                </div>
              )}
            </div>
          </div>
          
          {/* Right Column: PostureView */}
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
      </div>
      
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
    </div>
  );
}

export default App; 