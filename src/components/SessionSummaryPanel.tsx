import React, { useState, useEffect } from 'react';
import { getRandomQuote } from '../utils/quoteUtils';
import { SessionData } from '../store/historySlice';

interface SessionSummaryProps {
  isVisible: boolean;
  onClose: () => void;
  sessionData: SessionData | null;
  streakCount?: number;
  onStreakEnded?: () => void;
}

export const SessionSummaryPanel = ({ 
  isVisible, 
  onClose, 
  sessionData, 
  streakCount = 0, 
  onStreakEnded 
}: SessionSummaryProps) => {
  const [quote, setQuote] = useState('');
  const [comment, setComment] = useState('');
  const [distractionCount, setDistractionCount] = useState(0);
  const [streakEnded, setStreakEnded] = useState(false);
  const [rating, setRating] = useState<number>(0);

  // Effect for setting the quote only when panel first becomes visible
  useEffect(() => {
    if (isVisible) {
      setQuote(getRandomQuote());
    }
  }, [isVisible]);

  // Separate effect for handling initial session data
  useEffect(() => {
    if (isVisible && sessionData) {
      // Only set the initial comment if the comment state is empty
      // and we have a sessionData.comment
      if (comment === '' && sessionData.comment) {
        setComment(sessionData.comment);
      }
      
      // Always update distraction count from session data
      setDistractionCount(sessionData.distractions);
      
      // Check if this session ended the streak
      if (sessionData.distractions >= 3 && streakCount > 0) {
        setStreakEnded(true);
        if (onStreakEnded) {
          onStreakEnded();
        }
      } else {
        setStreakEnded(false);
      }
    }
  }, [isVisible, sessionData?.distractions, streakCount, onStreakEnded]);

  const handleCommentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setComment(e.target.value);
  };

  const handleAddDistraction = () => {
    const newCount = distractionCount + 1;
    setDistractionCount(newCount);
    
    // Check if adding this distraction will end the streak
    if (newCount >= 3 && streakCount > 0 && !streakEnded) {
      setStreakEnded(true);
      if (onStreakEnded) {
        onStreakEnded();
      }
    }
    
    if (sessionData) {
      sessionData.distractions = newCount;
    }
  };

  const handleSave = () => {
    if (sessionData) {
      sessionData.comment = comment;
      sessionData.distractions = distractionCount;
      
      // Save rating to localStorage as fallback
      if (rating > 0) {
        localStorage.setItem(`flowship:rating:${sessionData.timestamp}`, rating.toString());
      }
    }
    onClose();
  };

  if (!isVisible || !sessionData) return null;

  const formatDuration = (ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Show posture row only if the session recorded posture usage or has a posture value
  const showPosture = (
    sessionData.postureUsed === true ||
    typeof sessionData.posture === 'number'
  );

  const sessionId = sessionData.timestamp.toString();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 transition-opacity duration-300 ease-in-out">
      <div className="summary-modal max-w-md w-full mx-4 transition-all duration-300 ease-in-out animate-fade-in-up" role="dialog" aria-modal="true" aria-label="Session Summary">
        <div className="summary-header">
          <span className="summary-icon">💡</span>
          <h2 className="summary-title">Session Summary</h2>
        </div>

        {/* Streak Ended Message */}
        {streakEnded && (
          <div className="streak-ended-message">
            Oops, your streak ended! But remember: channel your inner Goggins and start the next session stronger.
          </div>
        )}

        {/* Inspirational Quote */}
        <p className="summary-quote">
          "{quote}"
        </p>

        <div className="summary-grid">
          <div className="summary-row">
            <span className="summary-icon">📝</span>
            <div><strong>Focus Goal:</strong></div>
            <div className="summary-row-value">
              {sessionData.goal ? sessionData.goal : '[Goal not found]'}
            </div>
          </div>

          <div className="summary-row">
            <span className="summary-icon">⏱️</span>
            <div><strong>Duration:</strong></div>
            <div className="summary-row-value">{formatDuration(sessionData.duration)}</div>
          </div>

          {showPosture && (
            <div className="summary-row">
              <span className="summary-icon">👤</span>
              <div><strong>Posture:</strong></div>
              <div className="summary-row-value">
                {typeof sessionData.posture === 'number' ? `${sessionData.posture}%` : 'Tracked'}
              </div>
            </div>
          )}

          <div className="summary-row">
            <span className="summary-icon">❌</span>
            <div><strong>Distractions:</strong></div>
            <div className="flex items-center gap-2">
              <span className="summary-row-value">{distractionCount}</span>
              <button
                onClick={handleAddDistraction}
                className="btn btn-add-distraction"
              >
                <span>❌</span>
                <span>Add</span>
              </button>
            </div>
          </div>

          <div className="summary-row" role="group" aria-label="Rate this session from 1 to 5 stars">
            <span className="summary-icon">⭐</span>
            <div><strong>Rate session:</strong></div>
            <div className="rating">
              {[5,4,3,2,1].map(n => (
                <React.Fragment key={n}>
                  <input
                    id={`rate-${sessionId}-${n}`}
                    name={`rate-${sessionId}`}
                    type="radio"
                    value={n}
                    checked={rating === n}
                    onChange={() => setRating(n)}
                    aria-label={`${n} star${n>1?'s':''}`}
                  />
                  <label htmlFor={`rate-${sessionId}-${n}`}><span className="star">★</span></label>
                </React.Fragment>
              ))}
            </div>
          </div>

        </div>

        <div className="summary-sep"></div>

        {/* Comment Field */}
        <div className="space-y-4">
          <div>
            <label htmlFor="session-comment" className="summary-label">
              How did it go?
            </label>
            <input
              id="session-comment"
              type="text"
              value={comment}
              onChange={handleCommentChange}
              onKeyDown={(e) => { if (e.key === 'Enter') { handleSave(); e.preventDefault(); } }}
              maxLength={40}
              placeholder="Brief comment on this session..."
              className="summary-input"
            />
          </div>
          
          {/* Save Button */}
          <div className="summary-actions">
            <button
              onClick={handleSave}
              className="btn btn-primary"
            >
              Save & Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}; 