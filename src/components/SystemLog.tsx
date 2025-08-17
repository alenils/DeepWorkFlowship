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
      className="panel-cockpit p-0 rounded-2xl"
      contentClassName="p-3"
    >
      <div className="relative">
        <div className="relative bg-black/60 border border-[rgba(0,224,211,0.25)] rounded-md overflow-hidden">
          <header className="px-3 py-1.5 font-mono text-[11px] text-emerald-400 border-b border-emerald-500/20 bg-black/40">
            System Log
          </header>
          <div className="relative terminal-gridlines">
            <textarea
              ref={textareaRef}
              value={note}
              onChange={handleNoteChange}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              placeholder="Log notes, thoughts, and events..."
              className="w-full font-mono text-[12px] leading-5 text-emerald-300/95 placeholder-emerald-500/50 bg-transparent outline-none resize-none px-3 py-3 h-[260px] md:h-[320px] overflow-auto pr-3"
            />
          </div>
          <div className="flex items-center px-3 py-1.5 border-t border-emerald-500/20 bg-black/40">
            <span className="font-mono text-emerald-400 mr-2">&gt;</span>
            <span className="inline-block w-[8px] h-[14px] bg-emerald-400 motion-safe:animate-pulse" aria-hidden />
            <span className="ml-auto text-[10px] text-emerald-300/60 font-mono">Alt+Shift+T → timestamp</span>
          </div>
        </div>
      </div>
    </InlineCollapsibleCard>
  );
}
;

export default SystemLog;
