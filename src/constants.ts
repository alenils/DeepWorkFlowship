/**
 * Application Constants
 * This file centralizes all constants used throughout the application to improve maintainability
 * and reduce the risk of errors from typos or inconsistent values.
 */

// ===== TIMER CONSTANTS =====
export const DEFAULT_TIMER_MINUTES = '25';
export const TIMER_UPDATE_INTERVAL_MS = 1000;
export const INFINITY_SYMBOL = '∞';

// ===== SESSION TYPES =====
export const SESSION_TYPE = {
  FOCUS: 'session',
  BREAK: 'break'
} as const;

// ===== DIFFICULTY LEVELS =====
export const DIFFICULTY = {
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard'
} as const;

export const DIFFICULTY_LABELS = {
  [DIFFICULTY.EASY]: 'Brain-Dead Task',
  [DIFFICULTY.MEDIUM]: 'High School Math',
  [DIFFICULTY.HARD]: 'Deep Thinking'
} as const;

// ===== POSTURE TRACKING =====
export const BAD_POSTURE_TIME_THRESHOLD_MS = 10000; // 10 seconds before triggering nudge
export const GOOD_POSTURE_THRESHOLD_PERCENT = 80; // 80% or above is considered good posture

// ===== SOUND FILES =====
export const SOUND_FILES = {
  START: 'start.mp3',
  PAUSE: 'pause.mp3',
  DONE: 'done.mp3',
  CANCEL: 'cancel.mp3',
  DISTRACTION: 'distraction.mp3',
  CHECK: 'check.mp3'
} as const;

// ===== WARP MODE =====
export const WARP_MODE = {
  NONE: 'none',
  BACKGROUND: 'background',
  FULL: 'full'
} as const;

export const WARP_ANIMATION = {
  STAR_COUNT: 520,         // For full warp
  STAR_COUNT_BG: 455,      // For background warp
  MAX_DEPTH: 300,          // Z-depth for star field
  DEFAULT_SPEED: 1.1       // Default animation speed
} as const;

// ===== APPLICATION MODES =====
export const APP_MODE = {
  FOCUS: 'focus',
  WARP: 'warp',
  STANDBY: 'standby'
} as const;

// ===== AUDIO =====
export const ALBUM_ID = {
  ALBUM1: 'album1',
  ALBUM2: 'album2'
} as const;

export const AUDIO_VOLUME = {
  SFX: 0.4,                // Default SFX volume
  MUSIC: 0.8,              // Default music volume
  DEFAULT_SFX: 0.7,        // Default SFX volume from appSlice
  DEFAULT_MUSIC: 0.5       // Default music volume from appSlice
} as const;

// ===== LOCAL STORAGE KEYS =====
export const STORAGE_KEYS = {
  HISTORY: 'deepwork-history-storage',
  TIMER: 'deepwork-timer-storage',
  APP: 'deepwork-app-storage',
  WARP: 'deepwork-warp-storage',
  DARK_MODE: 'darkMode',
  WARP_MODE: 'warpMode',
  LAST_DIFFICULTY: 'lastDifficulty',
  TOTAL_STREAK_SESSIONS: 'totalStreakSessions',
  POSTURE_TRACKING_ACTIVE: 'postureTrackingActive',
  NOTEPAD: 'notepad',
  TODO: 'todo',
  POSTURE_SENSITIVITY: 'postureSensitivity'
} as const;

// ===== STREAK SETTINGS =====
export const MAX_DISTRACTIONS_FOR_STREAK = 2; // Maximum number of distractions allowed to maintain streak

// ===== UI ELEMENT IDS =====
export const ELEMENT_IDS = {
  MINUTES_INPUT: 'minutesInput',
  WARP_CONTROLS: 'warpControls',
  WARP_DISTRACT: 'warpDistract',
  EXIT_WARP: 'exitWarp',
  WARP_FULL: 'warpfull',
  WARP_BG: 'warpbg'
} as const;

// ===== DEFAULT VALUES =====
export const DEFAULT_GOAL = 'YOLO-MODE'; // Default goal if none provided

// ===== CSS CLASSES =====
export const CSS_CLASSES = {
  WARP_DIMMED_TEXT: 'warp-dimmed-text',
  WARP_CONTROL_BUTTON: 'warp-control-button',
  WARP_DIM: 'warp-dim',
  OPACITY_70: 'opacity-70',
  OPACITY_50: 'opacity-50',
  WARP_FADED_BUTTON: 'warp-faded-button',
  BG_BLACK: 'bg-black'
} as const;

// ===== TOAST SETTINGS =====
export const TOAST_DURATION_MS = 3000; // Duration to show toast messages 