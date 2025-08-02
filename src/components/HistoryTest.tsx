import { useHistoryStore, SessionData, BreakData, generateId } from '../store/historySlice';

// Simple test component to verify the history slice works correctly
export const HistoryTest = () => {
  const { 
    history, 
    addHistoryItem, 
    updateSessionItem, 
    updateBreakItem,
    totalStreakSessions,
    incrementStreakSessions
  } = useHistoryStore();

  const addTestSession = () => {
    const sessionData: SessionData = {
      type: "session",
      id: generateId(),
      timestamp: Date.now(),
      duration: 25 * 60 * 1000, // 25 minutes
      goal: "Test session",
      distractions: 0,
      difficulty: "medium"
    };
    addHistoryItem(sessionData);
  };

  const addTestBreak = () => {
    const breakData: BreakData = {
      type: "break",
      id: generateId(),
      start: Date.now(),
      end: null,
      durationMs: 0,
      note: "Test break"
    };
    addHistoryItem(breakData);
  };

  const updateLatestSession = () => {
    const latestSession = history.find(item => item.type === "session");
    if (latestSession) {
      updateSessionItem(latestSession.id, {
        distractions: 3,
        comment: "Updated session"
      });
    }
  };

  const updateLatestBreak = () => {
    const latestBreak = history.find(item => item.type === "break");
    if (latestBreak) {
      updateBreakItem(latestBreak.id, {
        note: "Updated break",
        end: Date.now(),
        durationMs: 5 * 60 * 1000 // 5 minutes
      });
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">History Store Test</h2>
      
      <div className="flex gap-2 mb-4">
        <button 
          className="px-4 py-2 bg-deep-purple-600 text-white rounded" 
          onClick={addTestSession}
        >
          Add Session
        </button>
        
        <button 
          className="px-4 py-2 bg-green-500 text-white rounded" 
          onClick={addTestBreak}
        >
          Add Break
        </button>
        
        <button 
          className="px-4 py-2 bg-yellow-500 text-white rounded" 
          onClick={updateLatestSession}
        >
          Update Session
        </button>
        
        <button 
          className="px-4 py-2 bg-purple-500 text-white rounded" 
          onClick={updateLatestBreak}
        >
          Update Break
        </button>
        
        <button 
          className="px-4 py-2 bg-orange-500 text-white rounded" 
          onClick={incrementStreakSessions}
        >
          Increment Streak
        </button>
      </div>
      
      <div className="mb-4">
        <p>Total Streak Sessions: {totalStreakSessions}</p>
      </div>
      
      <div>
        <h3 className="text-lg font-bold mb-2">History Items:</h3>
        {history.length === 0 ? (
          <p>No history items yet</p>
        ) : (
          <ul className="space-y-2">
            {history.map(item => (
              <li key={item.id} className="p-2 border rounded">
                {item.type === "session" ? (
                  <div>
                    <p><strong>Session:</strong> {item.goal}</p>
                    <p>Duration: {Math.floor(item.duration / 60000)} min</p>
                    <p>Distractions: {item.distractions}</p>
                    {item.comment && <p>Comment: {item.comment}</p>}
                  </div>
                ) : (
                  <div>
                    <p><strong>Break</strong></p>
                    <p>Status: {item.end ? 'Ended' : 'Active'}</p>
                    <p>Duration: {item.end ? Math.floor(item.durationMs / 60000) : 'N/A'} min</p>
                    <p>Note: {item.note}</p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}; 