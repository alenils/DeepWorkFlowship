import React, { useEffect, useState } from 'react';
import { useSound } from '../features/audio/useSound';
import { STORAGE_KEYS } from '../constants';
import InlineCollapsibleCard from './ui/InlineCollapsibleCard';
import { useInlineMinimize } from '../hooks/useInlineMinimize';

interface TodoItem {
  id: string;
  text: string;
  done: boolean;
  // Marks items created via Mission Goal feature
  fromGoal?: boolean;
}

export const MissionBoard: React.FC = () => {
  const [items, setItems] = useState<TodoItem[]>([]);
  const [newItemText, setNewItemText] = useState('');
  const playCheckSound = useSound('check.mp3');
  const { collapsed, toggle } = useInlineMinimize('mission-board', false);

  // Load items
  useEffect(() => {
    const savedItems = localStorage.getItem(STORAGE_KEYS.TODO);
    if (savedItems) {
      try {
        const parsed = JSON.parse(savedItems);
        if (Array.isArray(parsed)) setItems(parsed);
      } catch (e) {
        console.error('Failed to parse todo items:', e);
      }
    }
  }, []);

  // Persist items
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TODO, JSON.stringify(items));
  }, [items]);

  const generateId = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

  const addItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemText.trim()) return;
    setItems(prev => [{ id: generateId(), text: newItemText.trim(), done: false, fromGoal: false }, ...prev]);
    setNewItemText('');
  };

  // Listen for mission additions from Goal Panel
  useEffect(() => {
    const onAdd = (e: Event) => {
      try {
        const { title, source } = (e as CustomEvent<{ title?: string; source?: string }>).detail ?? {};
        if (!title || !title.trim()) return;
        setItems(prev => [{ id: generateId(), text: title.trim(), done: false, fromGoal: source === 'goal-panel' }, ...prev]);
      } catch (err) {
        console.warn('[MissionBoard] Failed to handle mission:add', err);
      }
    };
    window.addEventListener('mission:add', onAdd as EventListener);
    return () => window.removeEventListener('mission:add', onAdd as EventListener);
  }, []);

  const toggleItem = (id: string) => {
    setItems(prev => prev.map(it => {
      if (it.id === id) {
        const newDone = !it.done;
        if (newDone) playCheckSound();
        return { ...it, done: newDone };
      }
      return it;
    }));
  };

  const deleteItem = (id: string) => setItems(prev => prev.filter(it => it.id !== id));

  return (
    <InlineCollapsibleCard
      id="mission-board"
      title="Mission Board"
      helpTitle="Add, check, and delete tasks"
      onHelpClick={() => {}}
      collapsed={collapsed}
      onToggleCollapse={toggle}
      variant="v2"
      className="panel--no-pad panel-v2--hoverable"
      contentClassName="p-3"
    >
      {/* Add new */}
      <form onSubmit={addItem} className="mb-3 flex items-center gap-2">
        <input
          type="text"
          value={newItemText}
          onChange={e => setNewItemText(e.target.value)}
          placeholder="New mission..."
          className="mission-input font-mono flex-grow min-w-0 rounded-l-md rounded-r-none border-r-0"
        />
        <button
          type="submit"
          className="relative overflow-hidden btn-shimmer btn-primary text-white font-semibold btn--condensed-text rounded-r-md rounded-l-none px-3.5 py-2.5 shadow-md hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-violet-400"
        >
          Add
        </button>
      </form>

      {/* List */}
      <div className="space-y-1.5 max-h-[60vh] overflow-y-auto pr-1">
        {items.length === 0 ? (
          <div className="text-xs text-gray-500 dark:text-gray-400 py-2">No missions yet.</div>
        ) : (
          items.map(item => (
            <div
              key={item.id}
              className={`mission-row flex items-center gap-2 rounded-r border-l-2 pl-3 pr-2 py-2 text-[13px] font-mono transition-colors bg-[linear-gradient(90deg,rgba(139,135,255,0.02),rgba(139,135,255,0.05))] hover:bg-[rgba(139,135,255,0.08)] border-l-[rgba(139,135,255,0.25)] hover:border-l-violet-400 group`}
            >
              <label className="flex items-center gap-3 min-w-0 cursor-pointer flex-1">
                <input
                  type="checkbox"
                  checked={item.done}
                  onChange={() => toggleItem(item.id)}
                  className="h-[14px] w-[14px] rounded-[3px] border border-[rgba(139,135,255,0.4)] bg-transparent accent-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.35)] focus:ring-1 focus:ring-emerald-400 dark:border-[rgba(139,135,255,0.35)] dark:bg-gray-800"
                />
                {/* Purple star for Mission Goal-originated items */}
                {item.fromGoal && (
                  <span className="shrink-0 text-violet-500 drop-shadow-[0_0_6px_rgba(139,92,246,0.6)]" title="Mission Goal">
                    {/* solid star icon, inherits currentColor */}
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.802 2.036a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.802-2.036a1 1 0 00-1.176 0l-2.802 2.036c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </span>
                )}
                <span className={`truncate ${item.done ? 'line-through text-gray-400 dark:text-gray-400' : 'text-gray-800 dark:text-gray-100'}`}>
                  {item.text}
                </span>
              </label>
              <button
                onClick={() => deleteItem(item.id)}
                className="text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Delete item"
                title="Delete"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          ))
        )}
      </div>
    </InlineCollapsibleCard>
  );
}
;

export default MissionBoard;
