import { useState, useEffect, useRef } from 'react';
import { msToClock } from '../utils/time';
import { TIMER_UPDATE_INTERVAL_MS } from '../constants';

interface BreakEntryProps {
  breakStartTime: number; // When the previous session ended
  breakEndTime: number | null;  // Now using null for open breaks
  note: string;
  onNoteChange: (note: string) => void;
  onNoteSave: (note: string) => void;
  isActive: boolean;     // Whether this is the current active break
}

export const BreakEntry = ({ 
  breakStartTime, 
  breakEndTime, 
  note, 
  onNoteChange, 
  onNoteSave,
  isActive 
}: BreakEntryProps) => {
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Update the break timer every second if it's active
  useEffect(() => {
    // For completed breaks (where breakEndTime is not null), use the final duration
    if (breakEndTime !== null) {
      setElapsedTime(breakEndTime - breakStartTime);
      // No need for interval - this is a completed break
      return;
    }
    
    // For active breaks (isActive && breakEndTime === null), update continuously
    if (isActive) {
      // Set initial elapsed time
      setElapsedTime(Date.now() - breakStartTime);
      
      // Start interval for active break
      const intervalId = setInterval(() => {
        setElapsedTime(Date.now() - breakStartTime);
      }, TIMER_UPDATE_INTERVAL_MS);
      
      return () => clearInterval(intervalId);
    }
    
    // For a break that was active but is now inactive (and doesn't have breakEndTime set),
    // calculate the final elapsed time but don't keep updating
    setElapsedTime(Date.now() - breakStartTime);
  }, [isActive, breakStartTime, breakEndTime]);
  
  // Handle key press for saving note on Enter
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onNoteSave(note);
      if (inputRef.current) {
        inputRef.current.blur();
      }
    }
  };
  
  return (
    <div className="bg-gray-100 dark:bg-gray-700 rounded p-2 text-xs flex items-center space-x-3">
      {/* Break duration */}
      <span className="text-gray-500 dark:text-gray-400 flex-shrink-0 italic">
        ⏱ {msToClock(elapsedTime)} break
      </span>
      {/* Note input - takes remaining space */}
      <input
        ref={inputRef}
        type="text"
        placeholder="What did you do during the break?" 
        value={note}
        onChange={(e) => onNoteChange(e.target.value)}
        onKeyPress={handleKeyPress}
        className="w-full flex-grow bg-transparent text-gray-700 dark:text-gray-300 
          placeholder-gray-400 dark:placeholder-gray-500 text-xs italic
          focus:outline-none p-1 -m-1"
      />
    </div>
  );
}; 