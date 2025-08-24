import React, { useEffect, useMemo, useRef, useState } from 'react';
import { STORAGE_KEYS } from '../constants';
import InlineCollapsibleCard from './ui/InlineCollapsibleCard';
import { useInlineMinimize } from '../hooks/useInlineMinimize';
import { useMissionsStore } from '../store/missionsSlice';

export const SystemLog: React.FC = () => {
  const [note, setNote] = useState('');
  const saveTimeoutRef = useRef<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [overlayScrollTop, setOverlayScrollTop] = useState(0);
  const { collapsed, toggle } = useInlineMinimize('system-log', false);

  // Missions for project selection
  const missions = useMissionsStore((s) => s.missions);
  const activeMissionId = useMissionsStore((s) => s.activeMissionId);

  // Selected project for this System Log: 'general' or mission.id
  const GENERAL = 'general';
  const [selectedId, setSelectedId] = useState<string>(GENERAL);

  // Compute storage key for current selection
  const keyFor = (id: string) =>
    id === GENERAL
      ? STORAGE_KEYS.SYSTEM_LOG_GENERAL
      : `${STORAGE_KEYS.SYSTEM_LOG_PREFIX}${id}`;

  // Initial selection + migration from legacy NOTEPAD to GENERAL
  useEffect(() => {
    try {
      const savedSelected = localStorage.getItem(STORAGE_KEYS.SYSTEM_LOG_SELECTED);
      const initial = savedSelected || activeMissionId || GENERAL;
      setSelectedId(initial);

      // Migration: if no general exists but legacy NOTEPAD does, move it
      const hasGeneral = !!localStorage.getItem(STORAGE_KEYS.SYSTEM_LOG_GENERAL);
      const legacy = localStorage.getItem(STORAGE_KEYS.NOTEPAD);
      if (!hasGeneral && legacy && legacy.trim().length > 0) {
        localStorage.setItem(STORAGE_KEYS.SYSTEM_LOG_GENERAL, legacy);
        // Optional: clean up old key after migrating
        try { localStorage.removeItem(STORAGE_KEYS.NOTEPAD); } catch {}
      }
    } catch (e) {
      // noop
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist selectedId
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SYSTEM_LOG_SELECTED, selectedId);
    } catch {}
  }, [selectedId]);

  // Load saved note for current selection
  useEffect(() => {
    try {
      const saved = localStorage.getItem(keyFor(selectedId));
      setNote(saved || '');
    } catch {
      setNote('');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  // Handle note changes with auto-save
  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newNote = e.target.value;
    setNote(newNote);

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = window.setTimeout(() => {
      localStorage.setItem(keyFor(selectedId), newNote);
      // console.log('SystemLog auto-saved');
    }, 1500);
  };

  // Save on blur
  const handleBlur = () => {
    localStorage.setItem(keyFor(selectedId), note);
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
      localStorage.setItem(keyFor(selectedId), newValue);
      setTimeout(() => {
        ta.selectionStart = start + ts.length;
        ta.selectionEnd = start + ts.length;
        ta.focus();
      }, 0);
    }
  };

  // Switch selected project, flushing current content to its key first
  const handleSelectChange = (nextId: string) => {
    try {
      // flush any pending debounce on old key
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      localStorage.setItem(keyFor(selectedId), note);
    } catch {}
    setSelectedId(nextId);
  };

  // Keep overlay scroll in sync with textarea
  const handleScroll = () => {
    if (textareaRef.current) {
      setOverlayScrollTop(textareaRef.current.scrollTop);
    }
  };

  // Escape HTML and wrap timestamps in a gray span
  const highlightedHtml = useMemo(() => {
    const escapeHtml = (str: string) =>
      str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\"/g, '&quot;')
        .replace(/'/g, '&#039;');
    const escaped = escapeHtml(note);
    // Match times like 00:00 .. 23:59
    const timeRegex = /\b(?:[01]?\d|2[0-3]):[0-5]\d\b/g;
    return escaped.replace(timeRegex, (m) => `<span class=\"text-gray-400\">${m}</span>`);
  }, [note]);

  return (
    <InlineCollapsibleCard
      id="system-log"
      title="System Log"
      helpTitle="Hint: Alt + Shift + T inserts timestamp"
      onHelpClick={() => {}}
      collapsed={collapsed}
      onToggleCollapse={toggle}
      variant="v2"
      className="panel--no-pad panel-hover"
      contentClassName="content-pad-lg"
      headerRight={
        <div className="flex items-center gap-2">
          <label htmlFor="system-log-project" className="sr-only">Project</label>
          <select
            id="system-log-project"
            value={selectedId}
            onChange={(e) => handleSelectChange(e.target.value)}
            className="px-2 py-1 text-xs rounded-md bg-white/70 dark:bg-gray-700/60 border border-violet-300/40 dark:border-violet-300/30 focus:outline-none focus:ring-2 focus:ring-violet-400"
          >
            <option value={GENERAL}>General</option>
            {missions.filter((m) => !m.archived).map((m) => (
              <option key={m.id} value={m.id}>{m.title || 'Untitled'}</option>
            ))}
          </select>
        </div>
      }
    >
      <div className="relative">
        <div className="terminal">
          <header className="px-3 py-1.5 font-mono text-[11px] text-emerald-400 border-b border-emerald-500/20 bg-black/40">
            System Log
          </header>
          <div className="relative">
            {/* Highlighting overlay */}
            <div
              ref={overlayRef}
              className="absolute inset-0 pointer-events-none overflow-hidden px-3 py-3 pr-3"
            >
              <pre
                className="whitespace-pre-wrap break-words font-mono text-[12px] leading-5 text-emerald-300/95"
                style={{ transform: `translateY(-${overlayScrollTop}px)` }}
                dangerouslySetInnerHTML={{ __html: highlightedHtml }}
              />
            </div>
            {/* Editable layer */}
            <textarea
              ref={textareaRef}
              value={note}
              onChange={handleNoteChange}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              onScroll={handleScroll}
              placeholder="Log notes, thoughts, and events..."
              className="w-full font-mono text-[12px] leading-5 text-transparent caret-emerald-300 placeholder-emerald-500/50 bg-transparent outline-none resize-none px-3 py-3 h-[260px] md:h-[320px] overflow-auto pr-3"
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
