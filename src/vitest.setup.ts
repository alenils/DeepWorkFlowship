import { vi } from 'vitest';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn((key: string) => null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // Deprecated but might be used
    removeListener: vi.fn(), // Deprecated but might be used
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock AudioContext
const mockGainNode = {
  connect: vi.fn(),
  gain: { setValueAtTime: vi.fn(), value: 1 },
};

const mockAudioContextInstance = {
  createGain: vi.fn(() => mockGainNode),
  createBufferSource: vi.fn(() => ({ 
    connect: vi.fn(), 
    start: vi.fn(), 
    stop: vi.fn(), 
    buffer: null 
  })),
  decodeAudioData: vi.fn(audioData => Promise.resolve(new ArrayBuffer(audioData?.byteLength || 0))),
  destination: { type: 'destination_placeholder' },
  currentTime: 0,
  resume: vi.fn(() => Promise.resolve()),
  state: 'running',
  close: vi.fn(() => Promise.resolve()),
};

Object.defineProperty(window, 'AudioContext', {
  writable: true,
  value: vi.fn().mockImplementation(() => mockAudioContextInstance),
});

Object.defineProperty(window, 'webkitAudioContext', {
  writable: true,
  value: vi.fn().mockImplementation(() => mockAudioContextInstance),
});

// Mock HTMLAudioElement (window.Audio)
const mockAudioElementInstance = {
  play: vi.fn(() => Promise.resolve()),
  pause: vi.fn(),
  load: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  canPlayType: vi.fn(type => (type === 'audio/mpeg' ? 'probably' : '')),
  setAttribute: vi.fn(),
  removeAttribute: vi.fn(),
  // Properties
  src: '',
  volume: 1,
  loop: false,
  currentTime: 0,
  duration: 100,
  paused: true,
  ended: false,
  HAVE_METADATA: 1,
  readyState: 0,
};

Object.defineProperty(window, 'Audio', {
  writable: true,
  value: vi.fn().mockImplementation(() => ({ ...mockAudioElementInstance })),
});

// Create a proper element factory function
const createElementFactory = (tag: string) => {
  // Basic element attributes/methods that all elements should have
  const baseElement = {
    tagName: tag.toUpperCase(),
    nodeName: tag.toUpperCase(),
    nodeType: 1,
    ownerDocument: document,
    setAttribute: vi.fn(),
    getAttribute: vi.fn(),
    removeAttribute: vi.fn(),
    hasAttribute: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
    appendChild: vi.fn(child => child),
    removeChild: vi.fn(),
    replaceChild: vi.fn(),
    cloneNode: vi.fn(deep => createElementFactory(tag)),
    children: [],
    childNodes: [],
    classList: {
      add: vi.fn(),
      remove: vi.fn(),
      toggle: vi.fn(),
      contains: vi.fn(() => false),
    },
    style: {},
    id: '',
    className: '',
    innerHTML: '',
    outerHTML: `<${tag}></${tag}>`,
    textContent: '',
    parentNode: null,
    nextSibling: null,
    previousSibling: null,
  };
  
  // Add specific properties/methods based on tag type
  if (tag === 'audio') {
    return { ...baseElement, ...mockAudioElementInstance };
  }
  
  // Add any other tag-specific properties here if needed
  // For example, for 'canvas':
  if (tag === 'canvas') {
    return {
      ...baseElement,
      getContext: vi.fn(() => ({
        fillRect: vi.fn(),
        clearRect: vi.fn(),
        getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4) })),
        putImageData: vi.fn(),
        createImageData: vi.fn(() => []),
        drawImage: vi.fn(),
        fillText: vi.fn(),
      })),
      width: 0,
      height: 0,
    };
  }
  
  return baseElement;
};

// Mock document object
Object.defineProperty(global, 'document', {
  value: {
    ...document,
    createElement: vi.fn().mockImplementation(tag => createElementFactory(tag)),
    createElementNS: vi.fn().mockImplementation((ns, tag) => createElementFactory(tag)),
    getElementById: vi.fn().mockImplementation(id => createElementFactory('div')),
    getElementsByClassName: vi.fn().mockImplementation(() => []),
    getElementsByTagName: vi.fn().mockImplementation(() => []),
    querySelector: vi.fn().mockImplementation(() => createElementFactory('div')),
    querySelectorAll: vi.fn().mockImplementation(() => []),
    documentElement: createElementFactory('html'),
    body: createElementFactory('body'),
    head: createElementFactory('head'),
  },
  writable: true,
});

// Global error event handler for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  // Prevent Vitest from failing on unhandled rejections from tests
  event.preventDefault();
}); 