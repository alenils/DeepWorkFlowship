import React, { useEffect, useRef } from 'react';
import { useTimerStore } from '../store/timerSlice';

// Keeping an empty interface in case we need to add props in the future
interface TimerProgressBarProps {}

export const TimerProgressBar: React.FC<TimerProgressBarProps> = () => {
  const { remainingTime, sessionDurationMs } = useTimerStore();
  const progressRef = useRef<HTMLDivElement>(null);
  const prevProgressRef = useRef<number>(0);
  
  // Prevent division by zero and handle infinite timer
  if (sessionDurationMs <= 0 || sessionDurationMs === Number.MAX_SAFE_INTEGER) {
    return null; // Don't show bar for invalid or infinite duration
  }

  const elapsedMs = sessionDurationMs - remainingTime;
  const progress = Math.max(0, Math.min(1, elapsedMs / sessionDurationMs)); // Clamp between 0 and 1
  
  // Update the progress bar with smooth animation when needed
  useEffect(() => {
    // Reset the progress when it goes back to 0
    if (progress === 0 && prevProgressRef.current > 0.9) {
      if (progressRef.current) {
        // Apply immediate reset without transition
        progressRef.current.style.transition = 'none';
        progressRef.current.style.width = '0%';
        
        // Force a reflow to ensure the transition removal takes effect
        progressRef.current.offsetWidth;
        
        // Restore transition for future updates
        setTimeout(() => {
          if (progressRef.current) {
            progressRef.current.style.transition = 'width 500ms linear, transform 500ms ease-out';
          }
        }, 50);
      }
    }
    
    // Save current progress for comparison on next update
    prevProgressRef.current = progress;
  }, [progress]);

  // Calculate vertical position - higher value means lower on screen
  // Start near the bottom (e.g., 8px up) and move towards top (0px)
  const verticalPosition = (1 - progress) * 8; // Adjust 8 for desired movement range

  return (
    <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden relative mt-2">
      <div 
        ref={progressRef}
        className="progress-shine h-full bg-deep-purple-600 dark:bg-deep-purple-500 rounded-full"
        style={{
          width: `${progress * 100}%`,
          transform: `translateY(${verticalPosition}px)`,
          transition: 'width 500ms linear, transform 500ms ease-out'
        }}
      />
      {/* Optional: Add subtle background gradient or texture */}
    </div>
  );
}; 