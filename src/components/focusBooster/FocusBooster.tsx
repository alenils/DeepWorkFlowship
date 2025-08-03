import React, { useEffect, useState } from 'react';
import { useFocusBoosterStore } from '../../store/focusBoosterSlice';
import { FOCUS_BOOSTER } from '../../constants';
import { useAudio } from '../../features/audio/AudioProvider';

export const FocusBooster: React.FC = () => {
  const { status, progress } = useFocusBoosterStore();
  const { exitBooster } = useFocusBoosterStore();
  const { playSfx } = useAudio();
  
  // State for text visibility
  const [showInitialText, setShowInitialText] = useState(false);
  const [showCompletionText, setShowCompletionText] = useState(false);
  
  // Play sounds based on status changes
  useEffect(() => {
    if (status === 'active') {
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
    } else if (status === 'finishing') {
      // Play completion sound
      playSfx(FOCUS_BOOSTER.SFX.COMPLETE);
      
      // Show completion text
      setShowCompletionText(true);
    } else {
      // Reset text states when idle
      setShowInitialText(false);
      setShowCompletionText(false);
    }
  }, [status, playSfx]);
  
  // If status is idle, don't render anything
  if (status === 'idle') {
    return null;
  }
  
  // Calculate the stroke-dasharray and stroke-dashoffset for the progress circle
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);
  
  return (
    <div className="fixed inset-0 z-[10001] flex items-center justify-center pointer-events-auto">
      {/* Semi-transparent overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-30 pointer-events-none" />
      
      {/* Central content */}
      <div className="relative flex flex-col items-center justify-center">
        {/* Progress circle */}
        <svg width="120" height="120" className="absolute">
          {/* Background circle */}
          <circle 
            cx="60" 
            cy="60" 
            r={radius} 
            fill="none" 
            stroke="rgba(255,255,255,0.2)" 
            strokeWidth="2"
          />
          
          {/* Progress circle */}
          <circle 
            cx="60" 
            cy="60" 
            r={radius} 
            fill="none" 
            stroke="rgba(255,255,255,0.8)" 
            strokeWidth="2"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            transform="rotate(-90 60 60)"
            style={{ transition: 'stroke-dashoffset 0.1s linear' }}
          />
        </svg>
        
        {/* Central dot with subtle glow */}
        <div className="relative">
          {/* Glow effect */}
          <div 
            className="absolute rounded-full bg-yellow-300/30"
            style={{ 
              width: '14px',
              height: '14px',
              top: '-5px',
              left: '-5px',
              filter: 'blur(4px)',
              boxShadow: '0 0 8px 2px rgba(250, 204, 21, 0.4)'
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
            FIXATE ON THE STAR
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