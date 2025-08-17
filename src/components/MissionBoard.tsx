import React, { useEffect, useState } from 'react';
import { useSound } from '../features/audio/useSound';
import { STORAGE_KEYS } from '../constants';
import InlineCollapsibleCard from './ui/InlineCollapsibleCard';
import { useInlineMinimize } from '../hooks/useInlineMinimize';

interface TodoItem {
  id: string;
  text: string;
  done: boolean;
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
    setItems(prev => [{ id: generateId(), text: newItemText.trim(), done: false }, ...prev]);
    setNewItemText('');
  };

  // Listen for mission additions from Goal Panel
  useEffect(() => {
    const onAdd = (e: Event) => {
      try {
        const { title } = (e as CustomEvent<{ title?: string }>).detail ?? {};
        if (!title || !title.trim()) return;
        setItems(prev => [{ id: generateId(), text: title.trim(), done: false }, ...prev]);
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
      subtitle={<span className="opacity-70">Plan and execute</span>}
      helpTitle="Add, check, and delete tasks"
      onHelpClick={() => {}}
      collapsed={collapsed}
      onToggleCollapse={toggle}
      className="p-0"
      contentClassName="p-3"
    >
      {/* Add new */}
      <form onSubmit={addItem} className="mb-3 flex items-center gap-2">
        <input
          type="text"
          value={newItemText}
          onChange={e => setNewItemText(e.target.value)}
          placeholder="New mission..."
          className="flex-grow min-w-0 p-2 text-sm border rounded-l focus:outline-none focus:ring-2 focus:ring-deep-purple-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        />
        <button
          type="submit"
          className="px-3 py-2 text-sm bg-deep-purple-600 text-white rounded-r font-medium hover:bg-deep-purple-700 dark:bg-deep-purple-700 dark:hover:bg-deep-purple-800"
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
              className={`px-3 py-2 rounded flex items-center justify-between group transition-colors duration-150 ${
                item.done ? 'bg-green-100 dark:bg-green-900/30 line-through' : 'bg-gray-100 dark:bg-gray-700/50'
              }`}
            >
              <label className="flex items-center gap-3 min-w-0 cursor-pointer">
                <input
                  type="checkbox"
                  checked={item.done}
                  onChange={() => toggleItem(item.id)}
                  className="h-4 w-4 rounded border-gray-300 text-deep-purple-600 focus:ring-deep-purple-500 dark:border-gray-600 dark:bg-gray-700"
                />
                <span className={`text-sm truncate ${item.done ? 'text-gray-500 dark:text-gray-400' : 'text-gray-800 dark:text-gray-200'}`}>
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
};

export default MissionBoard;
