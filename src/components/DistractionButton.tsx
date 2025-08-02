import { useSound } from '../features/audio/useSound';
import { useTimerStore } from '../store/timerSlice';

interface DistractionButtonProps {
  isVisible?: boolean; // Optional override
  className?: string; // Optional className prop
}

// Helper to generate tally marks
const TallyMarks = ({ count }: { count: number }) => {
  const fullGroups = Math.floor(count / 5);
  const remainder = count % 5;
  let marks = '';

  // Full groups ( HHH ) - Using unicode box drawing chars for crossing
  for (let i = 0; i < fullGroups; i++) {
    marks += '||||̸ '; // Four vertical bars + combining long stroke overlay
  }

  // Remainder
  marks += '|'.repeat(remainder);

  return <span className="text-white dark:text-white font-mono tracking-tighter text-sm ml-2">{marks || '0'}</span>;
};

export const DistractionButton = ({ 
  isVisible,
  className = '' // Default to empty string
}: DistractionButtonProps) => {
  // Get state and actions from store
  const { isSessionActive, isPaused, distractionCount, addDistraction } = useTimerStore();
  
  // Load and play distraction sound
  const playDistractionSound = useSound('distraction.mp3');

  const handleButtonClick = () => {
    playDistractionSound();
    addDistraction();
  };

  // If isVisible is explicitly passed, use that value, otherwise calculate from store
  const shouldBeVisible = isVisible !== undefined 
    ? isVisible 
    : isSessionActive && !isPaused;

  if (!shouldBeVisible) return null;

  return (
    <button
      onClick={handleButtonClick}
      className={`
        flex items-center
        bg-deep-purple-600 text-white hover:bg-deep-purple-700 dark:bg-deep-purple-700 dark:hover:bg-deep-purple-800
        px-3 py-1 rounded font-semibold 
        shadow-md border-2 border-white
        transition-all dark:opacity-95 dark:hover:opacity-100
        ${className}
      `}
      title="Log a distraction"
    >
      <span>DISTRACTED</span>
      <TallyMarks count={distractionCount} />
    </button>
  );
}; 