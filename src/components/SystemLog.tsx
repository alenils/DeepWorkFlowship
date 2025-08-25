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

  // Keyboard shortcuts: Alt+Shift+T inserts time, Alt+Shift+D inserts date at cursor
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
    if (e.altKey && e.shiftKey && e.key === 'D') {
      e.preventDefault();
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const ds = `${yyyy}-${mm}-${dd}`;

      const ta = textareaRef.current;
      if (!ta) return;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const newValue = note.substring(0, start) + ds + note.substring(end);
      setNote(newValue);
      localStorage.setItem(keyFor(selectedId), newValue);
      setTimeout(() => {
        ta.selectionStart = start + ds.length;
        ta.selectionEnd = start + ds.length;
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

  // Escape HTML and wrap timestamps/dates in spans for highlighting
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
    // Match dates like YYYY-MM-DD
    const dateRegex = /\b\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])\b/g;
    const withTimes = escaped.replace(timeRegex, (m) => `<span class=\"text-gray-400\">${m}</span>`);
    return withTimes.replace(dateRegex, (m) => `<span class=\"text-emerald-400\">${m}</span>`);
  }, [note]);

  return (
    <InlineCollapsibleCard
      id="system-log"
      title="System Log"
      helpTitle="Hints: Alt+Shift+T → time, Alt+Shift+D → date"
      onHelpClick={() => {}}
      collapsed={collapsed}
      onToggleCollapse={toggle}
      variant="v2"
      className="panel--no-pad panel-hover"
      contentClassName="content-pad-lg"
    >
      <div className="relative">
        <div className="terminal">
          <header className="px-3 py-1.5 border-b border-emerald-500/20 bg-black/40">
            <div className="flex items-center gap-2">
              <label htmlFor="system-log-project-inner" className="sr-only">Project</label>
              <select
                id="system-log-project-inner"
                value={selectedId}
                onChange={(e) => handleSelectChange(e.target.value)}
                className="syslog-select px-2 py-1 text-[11px] font-mono"
              >
                <option value={GENERAL}>General</option>
                {missions.filter((m) => !m.archived).map((m) => (
                  <option key={m.id} value={m.id}>{m.title || 'Untitled'}</option>
                ))}
              </select>
            </div>
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
            <div className="ml-auto text-right leading-tight font-mono text-emerald-300/60 text-[10px]">
              <div>Alt+Shift+T → time</div>
              <div>Alt+Shift+D → date</div>
            </div>
          </div>
        </div>
      </div>
    </InlineCollapsibleCard>
  );
}
;

export default SystemLog;
