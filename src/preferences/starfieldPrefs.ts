export type IdleRenderer = 'classic' | 'nova';

const KEY = 'starfield:idleRenderer';
const EVT = 'starfield:idleRendererChanged';

export function getIdleRenderer(): IdleRenderer {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'nova' ? 'nova' : 'classic';
  } catch {
    return 'classic';
  }
}

export function setIdleRenderer(value: IdleRenderer): void {
  try {
    localStorage.setItem(KEY, value);
  } catch {}
  try {
    const ev = new CustomEvent<IdleRenderer>(EVT, { detail: value });
    window.dispatchEvent(ev);
  } catch {}
}

export function onIdleRendererChange(cb: (value: IdleRenderer) => void): () => void {
  const handler = (e: Event) => {
    const ce = e as CustomEvent<IdleRenderer>;
    if (ce && typeof ce.detail === 'string') cb(ce.detail as IdleRenderer);
  };
  const storageHandler = (e: StorageEvent) => {
    if (e.key === KEY) {
      cb((e.newValue === 'nova' ? 'nova' : 'classic') as IdleRenderer);
    }
  };
  window.addEventListener(EVT, handler as EventListener);
  window.addEventListener('storage', storageHandler);
  return () => {
    window.removeEventListener(EVT, handler as EventListener);
    window.removeEventListener('storage', storageHandler);
  };
}
