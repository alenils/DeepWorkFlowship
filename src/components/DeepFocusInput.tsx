import { useState, useEffect } from 'react';
import { useTimerStore } from '../store/timerSlice';
import { STORAGE_KEYS, DIFFICULTY } from '../constants';
import type { Difficulty } from '@/store/missionsSlice';

interface DeepFocusInputProps {
  className?: string;
  // Sound handlers will be passed from parent until we move sound logic to store
  onStartSession?: () => void; // For playing sounds
}

const PLACEHOLDER_TEXTS = [
  "What do you fear doing?",
  "The resistance is big with this one...",
  "Oh, I've been avoiding this for ages...",
  "Only my mom can force me to do this!",
  "This task has been haunting me",
  "My boss will kill me if I don't do this",
  "I'll feel so good when this is done",
  "This is scarier than my morning face",
  "My future self will thank me",
  "The longer I wait, the scarier it gets",
  "Even my cat judges me for not doing this",
  "This is my final form of procrastination",
  "The task that keeps me up at night",
  "My anxiety's favorite procrastination",
  "Time to face my nemesis",
  "The task that's been stalking my todo list",
  "My productivity kryptonite",
  "The final boss of procrastination",
  "This isn't even my final form of avoidance",
  "The task that survived 100 todo lists"
];

export const DeepFocusInput = ({ className = '', onStartSession }: DeepFocusInputProps) => {
  const { 
    isSessionActive, 
    currentGoal,
    currentDifficulty,
    handleGoalSet,
    handleDifficultySet,
    startSession
  } = useTimerStore();
  
  const [goal, setGoal] = useState('');
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const [previousActiveState, setPreviousActiveState] = useState(isSessionActive);
  const [difficulty, setDifficulty] = useState<Difficulty>(currentDifficulty);

  // Store difficulty in localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.LAST_DIFFICULTY, difficulty);
  }, [difficulty]);

  // Load difficulty from localStorage on init
  useEffect(() => {
    const savedDifficulty = localStorage.getItem(STORAGE_KEYS.LAST_DIFFICULTY) as Difficulty | null;
    const normalized = savedDifficulty === DIFFICULTY.UNKNOWN ? DIFFICULTY.MEDIUM : savedDifficulty;
    if (normalized) {
      setDifficulty(normalized);
      handleDifficultySet(normalized);
    }
  }, [handleDifficultySet]);

  // Rotate placeholder text every 5 seconds
  useEffect(() => {
    if (isSessionActive || isFocused) return;

    const intervalId = setInterval(() => {
      setPlaceholderIndex(prev => (prev + 1) % PLACEHOLDER_TEXTS.length);
    }, 5000);

    return () => clearInterval(intervalId);
  }, [isSessionActive, isFocused]);

  // Reset input when session starts
  useEffect(() => {
    if (isSessionActive) {
      setGoal('');
    }
  }, [isSessionActive]);

  // Reset goal input when session ends
  useEffect(() => {
    // If session was active and now it's not, it has ended
    if (previousActiveState && !isSessionActive) {
      setGoal('');
    }
    setPreviousActiveState(isSessionActive);
  }, [isSessionActive, previousActiveState]);

  // Sync local goal state with store
  useEffect(() => {
    if (currentGoal && !goal) {
      setGoal(currentGoal);
    }
  }, [currentGoal, goal]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isSessionActive) {
      e.preventDefault();
      const finalGoal = goal.trim();
      if (finalGoal !== '' && difficulty) {
        handleGoalSet(finalGoal || 'YOLO-MODE');
        startSession();
        if (onStartSession) onStartSession(); // Play sound
      }
    }
  };

  const handleGoalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newGoal = e.target.value;
    setGoal(newGoal);
    if (!isSessionActive) {
      handleGoalSet(newGoal);
    }
  };

  const handleDifficultyChange = (newDifficulty: Difficulty) => {
    setDifficulty(newDifficulty);
    handleDifficultySet(newDifficulty);
  };

  const currentPlaceholder = isFocused && !goal 
    ? "What's your focus goal?" 
    : PLACEHOLDER_TEXTS[placeholderIndex];

  return (
    <div className={`${className}`}>
      <div className="relative mb-2">
        <input
          tabIndex={1}
          id="focusGoal"
          type="text"
          placeholder={currentPlaceholder}
          value={goal}
          onChange={handleGoalChange}
          onKeyPress={handleKeyPress}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          disabled={isSessionActive}
          className="goalInput w-full flex-grow min-w-0 max-w-[500px] px-4 py-2 border rounded-lg 
            focus:outline-none focus:ring-2 focus:ring-deep-purple-500
            dark:bg-gray-700 dark:border-gray-600 dark:text-white 
            dark:placeholder-gray-400 dark:focus:ring-deep-purple-400
            disabled:bg-gray-100 dark:disabled:bg-gray-800 
            disabled:text-gray-500 dark:disabled:text-gray-400
            text-[0.85rem]"
          maxLength={100}
        />
      </div>
      
      {/* Difficulty selector */}
      {!isSessionActive && (
        <div className="flex gap-2 text-xs">
          <button tabIndex={3}
            onClick={() => handleDifficultyChange('easy')} 
            className={`flex-1 py-1 px-2 rounded-md font-medium transition-colors
              ${difficulty === 'easy' 
                ? 'bg-green-500 text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'}`}
          >
            Brain-Dead Task
          </button>
          <button tabIndex={3}
            onClick={() => handleDifficultyChange('medium')} 
            className={`flex-1 py-1 px-2 rounded-md font-medium transition-colors
              ${difficulty === 'medium' 
                ? 'bg-orange-500 text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'}`}
          >
            High School Math
          </button>
          <button tabIndex={3}
            onClick={() => handleDifficultyChange('hard')} 
            className={`flex-1 py-1 px-2 rounded-md font-medium transition-colors
              ${difficulty === 'hard' 
                ? 'bg-red-500 text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'}`}
          >
            Deep Thinking
          </button>
        </div>
      )}
    </div>
  );
}; 