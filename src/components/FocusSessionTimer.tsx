import { useState, useCallback, useEffect } from 'react';
import { useTimerStore } from '../store/timerSlice';

interface FocusSessionTimerProps {
  isCompact?: boolean;
  // Sound handlers will be passed from parent until we move sound logic to store
  onSessionStart?: () => void; // For playing sounds
  onPause?: () => void; // For playing sounds
  onResume?: () => void; // For playing sounds
  onTimerEnd?: () => void; // For playing sounds
}

const MOTIVATIONAL_STARTS = [
  "FOCUS MODE ON",
  "LET'S CRUSH IT",
  "GO TIME",
  "BEAST MODE",
  "LEVEL UP",
  "DEEP DIVE",
  "FLOW STATE",
  "ZONE IN",
  "GAME ON",
  "POWER UP",
  "LOCK IN",
  "ALL IN",
  "FULL SEND",
  "ZERO FEAR",
  "GET AFTER IT",
  "DOMINATE",
  "UNLEASH",
  "NO LIMITS",
  "BREAKTHROUGH",
  "RISE UP"
];

const PAUSE_MESSAGES = [
  "Just a quick pee break",
  "BRB - Important Tinder match",
  "Need to pet my cat real quick",
  "Coffee refill emergency",
  "Quick stretch, back in 5",
  "Urgent snack situation",
  "Water break, staying hydrated",
  "Just checking my plants",
  "Quick meditation moment",
  "Bio break, nature calls"
];

const STOP_MESSAGES = [
  "Need to quit, can't go on",
  "It's just not happening now",
  "I can't be perfect all the time",
  "Today's not my day",
  "Brain.exe has stopped working",
  "Focus machine broke",
  "Time to regroup and retry",
  "Taking the L on this one",
  "Mission abort, need reset",
  "Saving energy for later"
];

export const FocusSessionTimer = ({ 
  isCompact = false,
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
    handleMinutesChange,
    startSession,
    pauseTimer,
    resumeTimer,
    stopTimer
  } = useTimerStore();
  
  const [startClickCount, setStartClickCount] = useState(0);
  const [pauseMessage, setPauseMessage] = useState(PAUSE_MESSAGES[0]);
  const [stopMessage, setStopMessage] = useState(STOP_MESSAGES[0]);
  const [streakCount, setStreakCount] = useState(0);

  useEffect(() => {
    const storedStreakCount = localStorage.getItem('totalStreakSessions');
    if (storedStreakCount) {
      const count = parseInt(storedStreakCount, 10);
      setStreakCount(count);
    }
  }, []);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'totalStreakSessions' && e.newValue) {
        const count = parseInt(e.newValue, 10);
        setStreakCount(count);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    const intervalId = setInterval(() => {
      const storedCount = localStorage.getItem('totalStreakSessions');
      if (storedCount) {
        const count = parseInt(storedCount, 10);
        if (count !== streakCount) {
          setStreakCount(count);
        }
      }
    }, 5000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(intervalId);
    };
  }, [streakCount]);

  const handleStart = () => {
    if (isSessionActive) return;

    startSession();
    if (onSessionStart) onSessionStart(); // Play sound
    
    const nextIndex = (startClickCount + 1) % MOTIVATIONAL_STARTS.length;
    setStartClickCount(nextIndex);
  };

  const handlePauseClick = useCallback(() => {
    if (!isSessionActive) return;
    
    if (isPaused) {
      resumeTimer();
      if (onResume) onResume(); // Play sound
    } else {
      pauseTimer();
      if (onPause) onPause(); // Play sound
      const nextMessage = PAUSE_MESSAGES[Math.floor(Math.random() * PAUSE_MESSAGES.length)];
      setPauseMessage(nextMessage);
    }
  }, [isSessionActive, isPaused, pauseTimer, resumeTimer, onPause, onResume]);

  const handleStop = () => {
    if (!isSessionActive) return;
    
    const nextMessage = STOP_MESSAGES[Math.floor(Math.random() * STOP_MESSAGES.length)];
    setStopMessage(nextMessage);
    
    stopTimer();
    if (onTimerEnd) onTimerEnd(); // Play sound
  };

  return (
    <div className={`flex ${isCompact ? 'flex-row items-center space-x-4' : 'flex-col items-center space-y-4 p-4'} relative`}>
      <div className={`flex items-center gap-2 ${isCompact ? '' : ''} z-10`}>
        <input
          tabIndex={2}
          id="minutesInput"
          type="text"
          value={isInfinite ? '∞' : minutes}
          onChange={(e) => handleMinutesChange(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && !isSessionActive && (isInfinite || minutes)) {
              handleStart();
            }
          }}
          className={`
            goalInput
            w-[60px] text-center
            px-3 py-2 border rounded-lg
            focus:outline-none focus:ring-2 focus:ring-blue-500
            dark:bg-gray-700 dark:border-gray-600 dark:text-white
            dark:focus:ring-blue-400
            text-[0.85rem]
            ${isSessionActive ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed' : ''}
          `}
          placeholder="25"
          disabled={isSessionActive}
          title={`Streak sessions: ${streakCount}`}
        />
        <span className="text-gray-600 dark:text-gray-400">min</span>
      </div>
      
      <div className="flex space-x-2 mt-2 md:mt-0">
        {!isSessionActive && (
          <button
            tabIndex={4}
            onClick={handleStart}
            disabled={!isInfinite && !minutes}
            className="w-28 h-10 rounded-full bg-[color:var(--accent-red)] text-white font-semibold hover:bg-red-700 transition-colors"
            title={`Streak sessions: ${streakCount}`}
          >
            JUST DO IT
          </button>
        )}

        {isSessionActive && (
          <>
            <button
              onClick={handlePauseClick}
              className={`
                px-4 py-2 rounded-lg font-medium text-sm
                transition-all duration-300 ease-in-out
                ${isPaused
                  ? 'bg-green-500 text-white hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700'
                  : 'bg-orange-500 text-white hover:bg-orange-600 dark:bg-orange-600 dark:hover:bg-orange-700'
                }
                ${isCompact ? 'text-sm py-2' : ''}
              `}
              title={pauseMessage}
            >
              {isPaused ? 'Resume' : 'Pause'}
            </button>

            <button
              onClick={handleStop}
              className={`
                px-3 py-1 rounded font-semibold 
                bg-red-600 hover:bg-red-700 text-white
                transition-opacity dark:opacity-90 dark:hover:opacity-100
                ${isCompact ? 'text-sm' : ''}
              `}
              title={stopMessage}
            >
              Stop
            </button>
          </>
        )}
      </div>
    </div>
  );
}; 