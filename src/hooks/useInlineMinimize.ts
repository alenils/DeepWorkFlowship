import { useCallback, useEffect, useMemo, useState } from 'react';

/**
 * useInlineMinimize
 * Manages a per-card collapsed state with localStorage persistence.
 *
 * Storage key format: `card-collapse:<id>` with values '1' (collapsed) or '0' (expanded)
 */
export function useInlineMinimize(id: string, defaultCollapsed = false) {
  const storageKey = useMemo(() => `card-collapse:${id}`, [id]);

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return defaultCollapsed;
    const v = localStorage.getItem(storageKey);
    if (v === '1') return true;
    if (v === '0') return false;
    return defaultCollapsed;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(storageKey, collapsed ? '1' : '0');
    } catch {}
  }, [collapsed, storageKey]);

  const toggle = useCallback(() => setCollapsed((c) => !c), []);

  // Listen for a global collapse-all event to minimize all inline cards on session start
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = () => setCollapsed(true);
    window.addEventListener('inline-collapse:all', handler);
    return () => {
      window.removeEventListener('inline-collapse:all', handler);
    };
  }, [setCollapsed]);

  // Listen for a per-panel set event to explicitly set collapsed state
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onSet = (e: Event) => {
      const target = e.target as HTMLElement | null;
      const pid = target?.getAttribute('data-panel-id');
      if (!pid || pid !== id) return;
      try {
        const ce = e as CustomEvent<{ collapsed?: boolean }>;
        if (typeof ce.detail?.collapsed === 'boolean') {
          setCollapsed(!!ce.detail.collapsed);
        }
      } catch {}
    };
    window.addEventListener('inline-collapse:set', onSet as EventListener);
    document.addEventListener('inline-collapse:set', onSet as EventListener);
    return () => {
      window.removeEventListener('inline-collapse:set', onSet as EventListener);
      document.removeEventListener('inline-collapse:set', onSet as EventListener);
    };
  }, [id, setCollapsed]);

  return { collapsed, setCollapsed, toggle } as const;
}

// --- DOM fallback snapshot/restore (Patch B) ---
type ExpandedMap = Record<string, boolean>;
const SNAP_KEY = 'panels:pre-session';

function writeSnapshot(map: ExpandedMap) {
  try { sessionStorage.setItem(SNAP_KEY, JSON.stringify(map)); } catch {}
}
function readSnapshot(): ExpandedMap | null {
  try { return JSON.parse(sessionStorage.getItem(SNAP_KEY) || 'null'); } catch { return null; }
}
function clearSnapshot() {
  try { sessionStorage.removeItem(SNAP_KEY); } catch {}
}

function getPanels(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('[data-panel-id]'));
}
function panelId(el: HTMLElement) {
  return el.getAttribute('data-panel-id') || '';
}
function isExpanded(el: HTMLElement): boolean {
  const dc = el.getAttribute('data-collapsed');
  if (dc != null) return dc !== 'true';
  const ae = el.getAttribute('aria-expanded');
  if (ae != null) return ae === 'true';
  return !el.classList.contains('collapsed');
}

function requestExpand(el: HTMLElement) {
  try {
    el.dispatchEvent(new CustomEvent('inline-collapse:set', { detail: { collapsed: false }, bubbles: true }));
  } catch {}
  el.setAttribute('data-collapsed', 'false');
  el.classList.remove('collapsed');
}

export function useInlineMinimizeSnapshot() {
  useEffect(() => {
    const onCapture = () => {
      const map: ExpandedMap = {};
      for (const el of getPanels()) map[panelId(el)] = isExpanded(el);
      writeSnapshot(map);
    };

    const onRestore = () => {
      const snap = readSnapshot();
      if (!snap) return;
      for (const el of getPanels()) {
        const id = panelId(el);
        if (id && snap[id]) requestExpand(el);
      }
      clearSnapshot();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('inline-collapse:capture', onCapture as EventListener);
      window.addEventListener('inline-collapse:restore', onRestore as EventListener);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('inline-collapse:capture', onCapture as EventListener);
        window.removeEventListener('inline-collapse:restore', onRestore as EventListener);
      }
    };
  }, []);
}
