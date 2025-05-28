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
import { useHistoryStore, SessionData, BreakData } from './store/historySlice'
import InstallPrompt from './components/InstallPrompt'

// Used TypeScript interfaces are imported from historySlice.ts now
// No need to redefine them here

// Star field animation constants (increased by ~30% for immediate fullness)
const STAR_COUNT = 520; // ~30% more stars for full warp
const STAR_COUNT_BG = 455; // ~30% more stars for background warp
const MAX_DEPTH = 300;

// Warp mode types
type WarpMode = 'none' | 'background' | 'full';

function App() {
  // Sound effects
  const playStartSound = useSound('start.mp3');
  const playPauseSound = useSound('pause.mp3');
  // We still need playDoneSound for sound effects in FocusSessionTimer
  const playDoneSound = useSound('done.mp3');
  const playCancelSound = useSound('cancel.mp3');
  const playDistractionSound = useSound('distraction.mp3');
  
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
    setHistory,
    setTotalStreakSessions,
    setLastSession,
    setShowSummary,
    updateSessionItem,
    updateBreakNote,
    clearHistory
  } = useHistoryStore();
  
  // Toast state
  const [toast, setToast] = useState({ show: false, message: '' });
  
  // Warp state
  const [warpMode, setWarpMode] = useState<WarpMode>('none');
  const [warpSpeed, setWarpSpeed] = useState(1.1);
  const warpCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const warpAnimationFrameIdRef = useRef<number | null>(null);
  const warpStarsRef = useRef<Array<{x: number, y: number, z: number}>>([]);
  
  // Posture tracking state
  const [postureStatus, setPostureStatus] = useState<boolean>(true);
  const [badPostureStartTime, setBadPostureStartTime] = useState<number | null>(null);
  const badPostureTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const badPostureTimeThreshold = 10000; // 10 seconds before triggering nudge
  
  // Initialize warp stars
  const initWarpStars = useCallback((count: number) => {
    const stars = [];
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * window.innerWidth * 2 - window.innerWidth,
        y: Math.random() * window.innerHeight * 2 - window.innerHeight,
        z: Math.random() * MAX_DEPTH
      });
    }
    warpStarsRef.current = stars;
  }, []);

  // Set warp mode
  const setWarpModeWithEffects = useCallback((mode: WarpMode) => {
    // Clean up existing warp if active
    if (warpMode !== 'none') {
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
      
      document.body.classList.remove('bg-black');
      document.body.style.overflow = '';
      
      // Remove any UI fading classes
      document.querySelectorAll('.warp-dimmed-text').forEach(el => {
        el.classList.remove('opacity-70', 'warp-dimmed-text');
      });
      document.querySelectorAll('.warp-control-button').forEach(el => {
        el.classList.remove('opacity-50', 'warp-faded-button');
      });
      // Remove warp-dim class from minute input
      const minutesInput = document.getElementById('minutesInput');
      if (minutesInput) {
        minutesInput.classList.remove('warp-dim');
      }
    }
    
    // Set up new warp mode
    if (mode !== 'none') {
      const isFull = mode === 'full';
      
      // Create canvas with appropriate z-index and styling
      const canvas = document.createElement('canvas');
      canvas.id = isFull ? 'warpfull' : 'warpbg';
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      
      if (isFull) {
        // Full warp
        document.body.classList.add('bg-black');
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
            el.classList.add('opacity-70', 'warp-dimmed-text');
          }
        });
        // Dim the minutes input immediately
        const minutesInput = document.getElementById('minutesInput');
        if (minutesInput) {
          minutesInput.classList.add('warp-dim');
        }
      }
      
      document.body.appendChild(canvas);
      warpCanvasRef.current = canvas;
      
      // Initialize stars (more stars for full warp)
      initWarpStars(isFull ? STAR_COUNT : STAR_COUNT_BG);
      
      // Start animation immediately
      animateWarpStars(warpSpeed);
    }
    
    // Update state and save to localStorage
    setWarpMode(mode);
    localStorage.setItem('warpMode', mode);
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
        star.z = MAX_DEPTH;
        star.x = Math.random() * canvas.width * 2 - canvas.width;
        star.y = Math.random() * canvas.height * 2 - canvas.height;
      }
      
      // Project star position to 2D
      const factor = MAX_DEPTH / (star.z || 1);
      const starX = star.x * factor + centerX;
      const starY = star.y * factor + centerY;
      
      // Only draw stars within canvas bounds
      if (starX >= 0 && starX <= canvas.width && starY >= 0 && starY <= canvas.height) {
        if (speedMultiplier > 100) {
          const warpFactor = (speedMultiplier - 100) / 900; // Normalize 0-1 for 100-1000x
          const perspectiveFactor = Math.max(0, (MAX_DEPTH - star.z) / MAX_DEPTH); // Ensure non-negative
          let lineLength = 5 + 150 * warpFactor * perspectiveFactor; 
          lineLength = Math.max(1, lineLength); // Ensure minimum length

          const angle = Math.atan2(star.y, star.x); // star.x, star.y are centered around 0

          const endX = starX + Math.cos(angle) * lineLength;
          const endY = starY + Math.sin(angle) * lineLength;
          
          ctx.beginPath();
          ctx.moveTo(starX, starY);
          ctx.lineTo(endX, endY);
          // Brighter/more opaque and thicker lines at higher speeds/warpFactor
          ctx.strokeStyle = `rgba(255, 255, 255, ${Math.min(1, 0.3 + warpFactor * 0.7 + perspectiveFactor * 0.2)})`;
          ctx.lineWidth = (1 + warpFactor * 2.5) * (perspectiveFactor * 0.7 + 0.3);
          ctx.stroke();
        } else {
          // Original dot drawing logic for lower speeds
          const size = Math.max(0.5, (1 - star.z / MAX_DEPTH) * 2);
          const opacity = Math.min(1, (1 - star.z / MAX_DEPTH) * 1.5);
          
          ctx.beginPath();
          ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
          ctx.arc(starX, starY, size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    });
    
    // Continue animation
    warpAnimationFrameIdRef.current = requestAnimationFrame(() => animateWarpStars(speedMultiplier));
  }, []);
  
  // Load warp settings from localStorage on init
  useEffect(() => {
    const savedMode = localStorage.getItem('warpMode') as WarpMode | null;
    if (savedMode && savedMode !== 'none') {
      setWarpMode(savedMode);
    }
    
    const savedSpeed = localStorage.getItem('warpSpeed');
    if (savedSpeed) {
      setWarpSpeed(parseFloat(savedSpeed));
    }
  }, []);
  
  // Handle speed change
  const handleWarpSpeedChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const sliderPosition = parseFloat(e.target.value); // sliderPosition is 0-100
    const newActualSpeed = Math.max(1, Math.pow(1000, sliderPosition / 100));
    
    setWarpSpeed(newActualSpeed);
    localStorage.setItem('warpSpeed', newActualSpeed.toString());
    
    if (warpMode !== 'none' && warpAnimationFrameIdRef.current) {
      cancelAnimationFrame(warpAnimationFrameIdRef.current);
      animateWarpStars(newActualSpeed);
    }
  }, [warpMode, animateWarpStars]);

  // Update canvas size when window resizes
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
  
  // Cleanup warp on unmount
  useEffect(() => {
    return () => {
      if (warpAnimationFrameIdRef.current) {
        cancelAnimationFrame(warpAnimationFrameIdRef.current);
      }
      
      if (warpCanvasRef.current) {
        document.body.removeChild(warpCanvasRef.current);
      }
      
      document.body.classList.remove('bg-black');
      document.body.style.overflow = '';
    };
  }, []);

  // Exit full warp mode with meteor
  const handleExitWarp = useCallback(() => {
    setWarpModeWithEffects('none');
  }, [setWarpModeWithEffects]);

  // Load initial data
  useEffect(() => {
    const storedHistory = JSON.parse(localStorage.getItem('history') || '[]');
    setHistory(storedHistory);
    
    // Load streak count from localStorage
    const storedStreakCount = localStorage.getItem('totalStreakSessions');
    if (storedStreakCount) {
      setTotalStreakSessions(parseInt(storedStreakCount, 10));
    }
  }, []);

  // Save history data
  useEffect(() => {
    localStorage.setItem('history', JSON.stringify(history));
  }, [history]);
  
  // Save streak count to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('totalStreakSessions', totalStreakSessions.toString());
  }, [totalStreakSessions]);
  
  // Toast display handler
  const showToast = useCallback((message: string) => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: '' }), 3000);
  }, []);

  // Warp distraction handler
  const handleWarpDistraction = useCallback(() => {
    if (isSessionActive && !isPaused) {
      addDistraction();
      playDistractionSound();
      showToast("Distraction recorded in warp mode!");
    }
  }, [isSessionActive, isPaused, addDistraction, showToast, playDistractionSound]);

  // Calculate total break time from all completed breaks
  const totalBreakTimeMs = useMemo(() => 
    history
      .filter((item): item is BreakData => item.type === "break" && item.end !== null)
      .reduce((sum, breakItem) => sum + breakItem.durationMs, 0),
  [history]);
  
  // Calculate total focus time from all sessions
  const totalFocusTimeMs = useMemo(() => 
    history
      .filter((item): item is SessionData => item.type === "session")
      .reduce((sum, session) => sum + session.duration, 0),
  [history]);

  // @ts-ignore - This function is used for handling distractions
  const handleDistraction = () => {
    if (isSessionActive && !isPaused) {
      addDistraction();
      playDistractionSound();
    }
  };

  // Calculate glow intensity based on streak count
  const getGlowClass = useCallback(() => {
    if (totalStreakSessions < 1) return '';
    return 'shadow-[0_0_0_2px_var(--tw-shadow-color),_0_0_10px_var(--tw-shadow-color)]';
  }, [totalStreakSessions]);

  // Add CSS for warp-dim class
  useEffect(() => {
    // Create a style element
    const styleEl = document.createElement('style');
    const cssContent = `
      #minutesInput.warp-dim {
        opacity: 0.55 !important;
      }
      .dark #minutesInput.warp-dim {
        opacity: 0.65 !important;
      }
    `;
    styleEl.textContent = cssContent;
    document.head.appendChild(styleEl);
    
    // Clean up on unmount
    return () => {
      if (styleEl && document.head.contains(styleEl)) {
        document.head.removeChild(styleEl);
      }
    };
  }, []);

  // Handle posture change from camera component - only trigger nudges during active sessions
  const handlePostureChange = useCallback((isGoodPosture: boolean) => {
    console.log("Posture status:", isGoodPosture ? "GOOD" : "BAD", isSessionActive ? "(in session)" : "(outside session)");
    
    setPostureStatus(isGoodPosture);
    
    // Only start timers if in an active session
    if (!isSessionActive) {
      // Clear any pending timeout if session is not active
      if (badPostureTimeoutRef.current) {
        clearTimeout(badPostureTimeoutRef.current);
        badPostureTimeoutRef.current = null;
      }
      return;
    }
    
    // If posture becomes bad, start the timer
    if (!isGoodPosture && badPostureStartTime === null) {
      console.log("Starting bad posture timer");
      setBadPostureStartTime(Date.now());
    } 
    // If posture becomes good, clear the timer
    else if (isGoodPosture && badPostureStartTime !== null) {
      console.log("Clearing bad posture timer - posture corrected");
      setBadPostureStartTime(null);
      
      // Clear any pending timeout
      if (badPostureTimeoutRef.current) {
        clearTimeout(badPostureTimeoutRef.current);
        badPostureTimeoutRef.current = null;
      }
    }
  }, [isSessionActive, badPostureStartTime]);
  
  // Monitor bad posture and trigger notification after threshold (only during active sessions)
  useEffect(() => {
    if (!isSessionActive || isPaused || badPostureTimeoutRef.current || !badPostureStartTime || postureStatus) {
      return;
    }
    
    // If posture is bad and we have a start time, set up the timeout
    badPostureTimeoutRef.current = setTimeout(() => {
      // Trigger posture nudge
      if (isSessionActive && !isPaused) {
        console.log("Posture nudge triggered after 10s of bad posture");
        // Remove the sound notification for posture issues
        // playDistractionSound();
        setToast({
          show: true,
          message: "Please correct your posture!"
        });
        
        // Update session data with posture issue
        if (lastSession && lastSession.type === 'session') {
          setLastSession({
            ...lastSession,
            posture: (lastSession.posture || 0) + 1
          });
        }
      }
      
      // Reset timer but keep tracking
      badPostureTimeoutRef.current = null;
      setBadPostureStartTime(null);
    }, badPostureTimeThreshold);
    
    return () => {
      if (badPostureTimeoutRef.current) {
        clearTimeout(badPostureTimeoutRef.current);
        badPostureTimeoutRef.current = null;
      }
    };
  }, [postureStatus, badPostureStartTime, isSessionActive, isPaused, lastSession, playDistractionSound]);

  // Add this named handleKeyDown function inside the component
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && warpMode !== 'none') {
      setWarpMode('none');
    }
  };

  // Then in the useEffect:
  useEffect(() => {
    if (warpMode !== 'none') {
      // Start warp mode animation
      animateWarpStars();
      
      // Add escape key handler
      window.addEventListener('keydown', handleKeyDown);
      
      // Cleanup
      return () => {
        animateWarpStars();
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [warpMode, animateWarpStars]);

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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      {warpMode !== 'full' && <DarkModeToggle />}

      {/* FULL WARP Controls */}
      {(warpMode === 'background' || warpMode === 'full') && (
        <div id="warpControls" className="absolute bottom-4 right-4 z-[10000] flex gap-3 items-center">
          <button
            id="warpDistract"
            onClick={handleWarpDistraction}
            className="bg-red-700/80 hover:bg-red-600/100 text-white font-semibold text-xs px-3 py-1.5 rounded-md backdrop-blur-sm transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-900/50 opacity-60 hover:opacity-100"
            title="Log distraction"
          >
            DISTRACTED
          </button>
          <button
            id="exitWarp"
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
                        className="warp-control-button"
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
          
          {/* Right Column: Camera and music player */}
          <div className="flex flex-col gap-6">
            {/* Camera placeholder */}
            <div>
              <PostureView 
                isSessionActive={isSessionActive} 
                onPostureChange={handlePostureChange} 
              />
            </div>
           
            {/* Updated MusicPlayer with isSessionActive prop */}
            <MusicPlayer isSessionActive={isSessionActive} />
            
            {/* Immersion Mode Controls */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-3">Immersion Mode</h3>
              <div className="flex flex-wrap gap-2 mb-3">
                <button
                  onClick={() => setWarpModeWithEffects('background')}
                  className={`rounded bg-zinc-800 text-white hover:bg-blue-600 transition text-sm px-2 py-1 ${warpMode === 'background' ? 'ring-2 ring-blue-500' : ''} warp-control-button`}
                  title="Stars visible behind dashboard"
                >
                  ✨ Warp Background
                </button>
                <button
                  onClick={() => setWarpModeWithEffects('full')}
                  className={`rounded bg-zinc-800 text-white hover:bg-blue-600 transition text-sm px-2 py-1 ${warpMode === 'full' ? 'ring-2 ring-blue-500' : ''} warp-control-button`}
                  title="Full immersive starfield"
                >
                  🌌 Warp Full
                </button>
              </div>
              
              {/* Speed throttle slider */}
              <div className="mt-2">
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Star Speed</label>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  step="1" 
                  value={Math.max(0, Math.min(100, 100 * (Math.log(Math.max(1, warpSpeed)) / Math.log(1000))))}
                  onChange={handleWarpSpeedChange}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                />
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <span>1×</span>
                  <span>{warpSpeed.toFixed(0)}×</span>
                  <span>1000×</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Session Summary Panel */}
        <SessionSummaryPanel 
          isVisible={showSummary}
          onClose={handleSummaryClose}
          sessionData={lastSession}
          streakCount={totalStreakSessions}
          onStreakEnded={() => setTotalStreakSessions(0)}
        />
        
        {/* Toast Notifications */}
        {toast.show && <Toast message={toast.message} />}
      </div>

      <InstallPrompt />
    </div>
  )
}

export default App 