import { useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { BreakEntry } from './BreakEntry';
import { msToClock } from '../utils/time';
import { 
  SESSION_TYPE, 
  DIFFICULTY, 
  DIFFICULTY_LABELS, 
  GOOD_POSTURE_THRESHOLD_PERCENT,
  MAX_DISTRACTIONS_FOR_STREAK
} from '../constants';
import { SessionData, BreakData, HistoryItem } from '../store/historySlice';

// History item type guard functions
const isSessionData = (item: HistoryItem): item is SessionData => item.type === SESSION_TYPE.FOCUS;
const isBreakData = (item: HistoryItem): item is BreakData => item.type === SESSION_TYPE.BREAK;

// Update props to use unified history
interface SessionHistoryProps {
  history: HistoryItem[];
  onBreakNoteChange: (breakId: string, note: string) => void;
  onBreakNoteSave: (breakId: string, note: string) => void;
}

export const SessionHistory = ({ 
  history,
  onBreakNoteChange,
  onBreakNoteSave
}: SessionHistoryProps) => { 
  
  // Filter just session items to check if we have any
  const sessionItems = useMemo(() => 
    history.filter(isSessionData), 
  [history]);

  // Find the oldest session for the "first session" indicator
  const oldestSession = useMemo(() => {
    const sessions = sessionItems.sort((a, b) => a.timestamp - b.timestamp);
    return sessions.length > 0 ? sessions[0] : null;
  }, [sessionItems]);

  if (sessionItems.length === 0) {
    return (
      <div className="text-center text-gray-500 dark:text-gray-400 py-4">
        No sessions recorded yet. Start your first focus session!
      </div>
    );
  }

  return (
    <>
      {/* Render all history items in order - newest first */}
      <div className="space-y-1">
        {history.map((item) => {
          if (isBreakData(item)) {
            // Render break item
            return (
              <BreakEntry
                key={`break-${item.id}`}
                breakStartTime={item.start}
                breakEndTime={item.end}
                note={item.note}
                onNoteChange={(note) => onBreakNoteChange(item.id, note)}
                onNoteSave={(note) => onBreakNoteSave(item.id, note)}
                isActive={item.end === null}
              />
            );
          } else {
            // Render session item
            const session = item;
            // Note: streak highlighting moved out; keep threshold for distraction color only
            
            // Difficulty badge (🟢/🟡/🟣)
            const difficultyBadge = {
              [DIFFICULTY.EASY]: '🟢',
              [DIFFICULTY.MEDIUM]: '🟡',
              [DIFFICULTY.HARD]: '🟣'
            }[session.difficulty || DIFFICULTY.MEDIUM];

            // Background color by difficulty (mirror timer chips with stronger contrast)
            const difficultyBg = {
              [DIFFICULTY.EASY]: 'bg-emerald-500/20 border border-emerald-500/40',
              [DIFFICULTY.MEDIUM]: 'bg-amber-500/20 border border-amber-500/40',
              [DIFFICULTY.HARD]: 'bg-violet-600/20 border border-violet-500/45',
            }[session.difficulty || DIFFICULTY.MEDIUM];

            // Left rail indicator per difficulty for immediate visual distinction
            const difficultyRail = {
              [DIFFICULTY.EASY]: 'bg-emerald-400/80',
              [DIFFICULTY.MEDIUM]: 'bg-amber-400/80',
              [DIFFICULTY.HARD]: 'bg-violet-500/80',
            }[session.difficulty || DIFFICULTY.MEDIUM];

            // Retrieve stored star rating for this session (saved by SessionSummaryPanel)
            let rating = 0;
            try {
              const v = localStorage.getItem(`flowship:rating:${session.timestamp}`);
              rating = v ? parseInt(v, 10) : 0;
            } catch {
              rating = 0;
            }
            
            return (
              <div 
                key={`session-${session.id}`} 
                className={`relative overflow-hidden rounded-lg pl-3 md:pl-4 p-3 text-sm flex items-center justify-between ${difficultyBg}`}
              >
                <span aria-hidden className={`absolute left-0 top-0 h-full w-1 ${difficultyRail}`} />
                <div className="flex items-center space-x-2 flex-1 overflow-hidden">
                  {/* Goal and difficulty badge */}
                  <span title={
                    session.difficulty === DIFFICULTY.EASY ? DIFFICULTY_LABELS[DIFFICULTY.EASY] :
                    session.difficulty === DIFFICULTY.MEDIUM ? DIFFICULTY_LABELS[DIFFICULTY.MEDIUM] :
                    DIFFICULTY_LABELS[DIFFICULTY.HARD]
                  } className="flex-shrink-0">
                    {difficultyBadge}
                  </span>
                  <span title="Goal" className="truncate text-gray-800 dark:text-gray-200 font-medium flex-1 flex items-center">
                    {session.goal}
                    {session.comment && (
                      <span className="ml-2 text-xs italic text-gray-500 dark:text-gray-400 truncate max-w-[160px] inline-block">
                        {session.comment}
                      </span>
                    )}
                  </span>
                </div>

                <div className="flex items-center space-x-3 flex-shrink-0">
                  {rating > 0 && (
                    <span title="Rating" className="text-amber-300/70 text-sm md:text-base leading-none">
                      {"★".repeat(Math.max(0, Math.min(5, rating)))}
                    </span>
                  )}
                  <span title="Duration" className="text-gray-600 dark:text-gray-400">
                    ⏱️ {msToClock(session.duration)}
                  </span>
                  <span title="Posture" className={`${session.posture !== undefined && session.posture >= GOOD_POSTURE_THRESHOLD_PERCENT ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`}>
                    👤 {session.posture !== undefined ? `${session.posture}%` : 'N/A'}
                  </span>
                  <span 
                    title={session.distractionLog ? `Distractions: ${session.distractionLog}` : "Distractions"} 
                    className={`flex items-center`}
                  >
                    <span className="text-violet-400 mr-1">✕</span>
                    <span className={`${session.distractions >= MAX_DISTRACTIONS_FOR_STREAK ? 'text-red-600 dark:text-red-400 font-bold' : 'text-green-600 dark:text-green-400'}`}>
                      {session.distractions}
                    </span>
                    {session.distractionLog && (
                      <span className="ml-1 text-xs inline-block text-gray-500 dark:text-gray-400">
                        📝
                      </span>
                    )}
                  </span>
                </div>
              </div>
            );
          }
        })}

        {/* First session indicator */}
        {oldestSession && (
          <div className="text-center text-gray-400 dark:text-gray-500 text-xs pt-1">
            First session recorded {formatDistanceToNow(
              oldestSession.timestamp, 
              { addSuffix: true }
            )}
          </div>
        )}
      </div>
    </>
  );
}; 