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

  return { collapsed, setCollapsed, toggle } as const;
}
