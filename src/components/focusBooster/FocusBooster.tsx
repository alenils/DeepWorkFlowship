import React, { useEffect, useState } from 'react';
import { useFocusBoosterStore } from '../../store/focusBoosterSlice';
import { FOCUS_BOOSTER } from '../../constants';
import { useAudio } from '../../features/audio/AudioProvider';

export const FocusBooster: React.FC = () => {
  const { status: boosterStatus, startTime: boosterStartTime } = useFocusBoosterStore();
  const { exitBooster } = useFocusBoosterStore();
  const { playSfx } = useAudio();
  
  // UI state
  const [showInitialText, setShowInitialText] = useState(false);
  const [showCompletionText, setShowCompletionText] = useState(false);
  
  // Animation state
  const [progressOffset, setProgressOffset] = useState(0);
  
  // Calculate boosterEndTime from startTime
  const boosterEndTime = boosterStartTime ? boosterStartTime + 30000 : null;
  
  // Circle properties
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  
  // Animation effect for circular progress
  useEffect(() => {
    // If the booster is not active, ensure the progress circle is reset.
    if (boosterStatus !== 'active' || !boosterEndTime) {
      setProgressOffset(circumference);
      return;
    }

    // Set up an interval that fires every second.
    const timerId = setInterval(() => {
      // Calculate progress based on the absolute end time. This is ACCURATE.
      const now = Date.now();
      const startTime = boosterEndTime - 30000; // The timestamp when it started
      const elapsedTime = now - startTime;
      const progressPercentage = Math.min(elapsedTime / 30000, 1);

      // Calculate the new SVG offset based on the accurate progress
      const offset = circumference * (1 - progressPercentage);
      setProgressOffset(offset);

      // When progress is complete, we don't need to do anything here,
      // as the main boosterSlice will handle the status change.
    }, 1000); // Tick every 1 second.

    // CRITICAL: Cleanup function to clear the interval when the component
    // unmounts or the effect re-runs (e.g., when the booster is exited).
    return () => {
      clearInterval(timerId);
    };
    
  }, [boosterStatus, boosterEndTime, circumference]);

  // Play sounds based on status changes
  useEffect(() => {
    if (boosterStatus === 'active') {
      // Play start sound when booster becomes active
      playSfx(FOCUS_BOOSTER.SFX.START);
      
      // Show initial text with a slight delay
      setTimeout(() => {
        setShowInitialText(true);
      }, 500);
      
      // Hide initial text after a delay
      setTimeout(() => {
        setShowInitialText(false);
      }, FOCUS_BOOSTER.TEXT_FADE_IN_DURATION_MS + FOCUS_BOOSTER.TEXT_FADE_OUT_DURATION_MS);
      
      // Play ambient sound (would be better with looping capability)
      // For now, we'll just play it once
      playSfx(FOCUS_BOOSTER.SFX.AMBIENT);
    } else if (boosterStatus === 'finishing') {
      // Play completion sound
      playSfx(FOCUS_BOOSTER.SFX.COMPLETE);
      
      // Show completion text
      setShowCompletionText(true);
    } else {
      // Reset text states when idle
      setShowInitialText(false);
      setShowCompletionText(false);
    }
  }, [boosterStatus, playSfx]);
  
  // If status is idle, don't render anything
  if (boosterStatus === 'idle') {
    return null;
  }
  
  // Calculate the stroke-dasharray for the progress circle
  const strokeDasharray = `${circumference} ${circumference}`;
  
  return (
    <div className="fixed inset-0 z-[10001] flex items-center justify-center pointer-events-auto">
      {/* Semi-transparent overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-30 pointer-events-none" />
      
      {/* Central content - adjusted for perfect centering */}
      <div className="relative flex flex-col items-center justify-center">
        {/* Wrapper ensures dot overlays exactly at the circle center */}
        <div className="relative w-[150px] h-[150px]">
          {/* Progress circle */}
          <svg width="150" height="150" viewBox="0 0 150 150" className="absolute inset-0">
            {/* Background track circle */}
            <circle 
              cx="75" 
              cy="75" 
              r={radius} 
              fill="none" 
              stroke="rgba(255, 255, 255, 0.2)" 
              strokeWidth="2"
            />
            
            {/* Progress circle */}
            <circle 
              cx="75" 
              cy="75" 
              r={radius} 
              fill="none" 
              stroke="#FBBF24" // Amber-400 color
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={progressOffset}
              transform="rotate(-90 75 75)" // Start from top (12 o'clock)
              style={{ 
                transition: 'stroke-dashoffset 0.1s linear' 
              }}
            />
          </svg>

          {/* Central dot with evenly distributed glow - absolutely centered */}
          <div className="absolute inset-0 flex items-center justify-center">
            {/* Outer glow effect */}
            <div 
              className="absolute rounded-full bg-yellow-300/20"
              style={{ 
                width: '24px',
                height: '24px',
                filter: 'blur(5px)',
                boxShadow: '0 0 10px 4px rgba(250, 204, 21, 0.3)'
              }} 
            />
            
            {/* Inner glow effect */}
            <div 
              className="absolute rounded-full bg-yellow-300/30"
              style={{ 
                width: '18px',
                height: '18px',
                filter: 'blur(3px)',
                boxShadow: '0 0 6px 2px rgba(250, 204, 21, 0.4)'
              }} 
            />
            
            {/* Central dot */}
            <div 
              className="w-4 h-4 bg-yellow-300 rounded-full z-10"
              style={{
                boxShadow: '0 0 5px rgba(250, 204, 21, 0.6)'
              }}
            />
          </div>
        </div>
        
        {/* Initial text - single straight line above the star */}
        <div
          className={`absolute transition-opacity duration-1500 ${
            showInitialText ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            top: '-140px',
            left: 0,
            right: 0,
            width: '100%',
            textAlign: 'center',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}
        >
          <span
            style={{
              color: 'white',
              fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              fontSize: '22px',
              fontWeight: '700',
              letterSpacing: '-0.05em',
              textShadow: '0 0 1px white',
              WebkitTextStroke: '1px white',
              whiteSpace: 'nowrap'
            }}
          >
            FIXATE ON THE DOT FOR 30 SEC, FOR FOCUS BOOST
          </span>
        </div>
        
        {/* Completion text - Apple-inspired design */}
        <div 
          className={`absolute text-center transition-opacity duration-1000 ${
            showCompletionText ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ 
            top: '120px',
            color: '#ffffff',
            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            fontSize: '18px',
            fontWeight: '700',
            letterSpacing: '-0.05em',
            textShadow: '0 0 1px white'
          }}
        >
          FOCUS PRIMED
        </div>
      </div>
      
      {/* Exit button */}
      <button
        onClick={exitBooster}
        className="absolute top-4 right-4 text-white bg-gray-800 bg-opacity-50 hover:bg-opacity-70 rounded-full p-2 transition-all"
        aria-label="Exit focus booster"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}; 