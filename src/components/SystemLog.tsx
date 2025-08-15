import React, { useEffect, useRef, useState } from 'react';
import { STORAGE_KEYS } from '../constants';
import InlineCollapsibleCard from './ui/InlineCollapsibleCard';
import { useInlineMinimize } from '../hooks/useInlineMinimize';

export const SystemLog: React.FC = () => {
  const [note, setNote] = useState('');
  const saveTimeoutRef = useRef<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { collapsed, toggle } = useInlineMinimize('system-log', false);

  // Load saved note from localStorage
  useEffect(() => {
    const savedNote = localStorage.getItem(STORAGE_KEYS.NOTEPAD);
    if (savedNote) setNote(savedNote);
  }, []);

  // Handle note changes with auto-save
  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newNote = e.target.value;
    setNote(newNote);

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = window.setTimeout(() => {
      localStorage.setItem(STORAGE_KEYS.NOTEPAD, newNote);
      // console.log('SystemLog auto-saved');
    }, 1500);
  };

  // Save on blur
  const handleBlur = () => {
    localStorage.setItem(STORAGE_KEYS.NOTEPAD, note);
  };

  // Keyboard shortcuts: Alt+Shift+T inserts timestamp at cursor
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.altKey && e.shiftKey && e.key === 'T') {
      e.preventDefault();
      const now = new Date();
      const hh = now.getHours().toString().padStart(2, '0');
      const mm = now.getMinutes().toString().padStart(2, '0');
      const ts = `${hh}:${mm}`;

      const ta = textareaRef.current;
      if (!ta) return;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const newValue = note.substring(0, start) + ts + note.substring(end);
      setNote(newValue);
      localStorage.setItem(STORAGE_KEYS.NOTEPAD, newValue);
      setTimeout(() => {
        ta.selectionStart = start + ts.length;
        ta.selectionEnd = start + ts.length;
        ta.focus();
      }, 0);
    }
  };

  return (
    <InlineCollapsibleCard
      id="system-log"
      title="System Log"
      subtitle={<span className="opacity-70">Monospace • Autosaves</span>}
      helpTitle="Hint: Alt + Shift + T inserts timestamp"
      onHelpClick={() => {}}
      collapsed={collapsed}
      onToggleCollapse={toggle}
      className="p-0"
      contentClassName="p-3"
    >
      <div className="relative">
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-amber-50/30 dark:bg-gray-800/60">
          <textarea
            ref={textareaRef}
            value={note}
            onChange={handleNoteChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder="Log notes, thoughts, and events..."
            className="w-full font-mono text-[12px] leading-5 text-gray-800 dark:text-gray-200 bg-transparent outline-none resize-none p-3 h-[300px] md:h-[360px] overflow-auto pr-3 pb-8"
          />
          {/* Sticky hint row overlay (kept visible at bottom) */}
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 px-3 py-1 text-[10px] italic text-center text-gray-700 dark:text-gray-300/80 bg-gradient-to-t from-amber-100/70 dark:from-gray-900/80 to-transparent">
            Alt + Shift + T inserts timestamp
          </div>
        </div>
      </div>
    </InlineCollapsibleCard>
  );
};

export default SystemLog;
