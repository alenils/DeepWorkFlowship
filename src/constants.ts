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
  HARD: 'hard',
  // For legacy/migrated or unspecified segments
  UNKNOWN: 'unknown'
} as const;

export const DIFFICULTY_LABELS = {
  [DIFFICULTY.EASY]: 'Brain-Dead Task',
  [DIFFICULTY.MEDIUM]: 'High School Math',
  [DIFFICULTY.HARD]: 'Deep Thinking',
  [DIFFICULTY.UNKNOWN]: 'Unknown'
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

// ===== FOCUS BOOSTER =====
export const FOCUS_BOOSTER = {
  DURATION_MS: 30000, // 30 seconds for the gaze-lock exercise
  FADE_DURATION_MS: 1000, // 1 second fade in/out for UI elements
  TEXT_FADE_IN_DURATION_MS: 1500, // 1.5 seconds fade in for text
  TEXT_FADE_OUT_DURATION_MS: 1500, // 1.5 seconds fade out for text
  COMPLETION_TEXT_DURATION_MS: 2000, // 2 seconds to show "FOCUS PRIMED" text
  SFX: {
    START: 'booster_start.mp3',
    AMBIENT: 'booster_ambient.mp3',
    COMPLETE: 'booster_complete.mp3'
  }
} as const;

// ===== WARP MODE =====
// LIGHT_SPEED_EXPERIMENT: master flag to enable the experimental LIGHT_SPEED mode and related UI
export const EXPERIMENT_LIGHT_SPEED = true as const; // Toggle to true to enable experiment

 

export const WARP_MODE = {
  NONE: 'none',
  BACKGROUND: 'background',
  FULL: 'full',
  // LIGHT_SPEED_EXPERIMENT: new experimental warp mode
  LIGHT_SPEED: 'light_speed'
} as const;

// LIGHT_SPEED_EXPERIMENT: configuration for LIGHT SPEED visuals and per-session variation
export const LIGHT_SPEED_CONFIG = {
  swirlSpeed: 2500,        // ms for full oscillation
  swirlAmplitude: 0.003,   // radians
  tunnelRadiusFactor: 0.10,// % of min(canvas.width, canvas.height)
  tunnelDarkness: 0.35,    // 0 = no dark center, 1 = full black
  edgeBrightness: 0.95,    // alpha at edges
  centerBrightness: 0.70,  // alpha at center

  variation: {
    swirlSpeedRange: [2000, 3000] as [number, number],     // ms range
    swirlAmplitudeRange: [0.002, 0.004] as [number, number],
    tunnelRadiusRange: [0.08, 0.12] as [number, number],   // factor range
    tunnelDarknessRange: [0.3, 0.4] as [number, number]
  }
} as const;

export const WARP_ANIMATION = {
  STAR_COUNT: 520,         // For full warp
  STAR_COUNT_BG: 455,      // For background warp
  MAX_DEPTH: 300,          // Z-depth for star field
  DEFAULT_SPEED: 1.1,      // Default animation speed
  MIN_SPEED_FOR_STREAKS: 1.2,  // Further reduced threshold for easier streaking visibility
  STREAK_INTENSITY: 2.0,   // Significantly increased intensity for streaking effect
  IDLE_SPEED_FACTOR: 0.0575, // Speed factor when no session is active (increased by 15% for more visible movement)
  THRUST_SPEED_MULTIPLIER: 8.0, // Increased speed multiplier during thrust effect
  THRUST_FADE_DURATION_MS: 3000, // Extended from 2000ms to 3000ms for a longer initial thrust feel
  MAX_STREAK_LENGTH: 300,  // Increased further for dramatic hyperspace lines
  MAX_EFFECTIVE_SPEED: 25.0, // Increased from 20.0 to 25.0 to allow for higher maximum speeds
  THRUST_EFFECT_SPEED: 25.0, // Dramatically increased speed for thrust effect
  DEFAULT_SESSION_SPEED: 8.0, // Default speed during an active session (high warp speed)
  DECELERATION_DURATION_MS: 2000, // Duration of smooth deceleration when a session ends
  STREAK_BASE_LENGTH: 18,  // Increased base length for star streaks even at minimum streaking speed
  STREAK_LENGTH_FACTOR: 80, // Stronger multiplier for longer streaks at high speed
  HYPERSPACE_THRESHOLD: 6.0 // Reduced threshold for hyperspace-like effects
} as const;

// Normalized thresholds used by starfield for gating modes.
// Reuse existing values to avoid duplication/mismatch.
export const STARFIELD_THRESHOLDS = {
  HYPERSPACE: WARP_ANIMATION.HYPERSPACE_THRESHOLD,
  WARP: 3.0,
} as const;

// ===== STARFIELD QUALITY SETTINGS =====
export const STARFIELD_QUALITY = {
  OFF: 'off',
  ECO: 'eco',
  STANDARD: 'standard',
  ULTRA: 'ultra'
} as const;

export const STARFIELD_QUALITY_LABELS = {
  [STARFIELD_QUALITY.OFF]: 'Off',
  [STARFIELD_QUALITY.ECO]: 'Eco',
  [STARFIELD_QUALITY.STANDARD]: 'Standard',
  [STARFIELD_QUALITY.ULTRA]: 'Ultra'
} as const;

export const STAR_COUNTS_BY_QUALITY = {
  [STARFIELD_QUALITY.OFF]: 0,
  [STARFIELD_QUALITY.ECO]: 200,
  [STARFIELD_QUALITY.STANDARD]: 500,
  [STARFIELD_QUALITY.ULTRA]: 1000
} as const;

export const STAR_SPEED_FACTORS_BY_QUALITY = {
  [STARFIELD_QUALITY.OFF]: 0,
  [STARFIELD_QUALITY.ECO]: 0.8,
  [STARFIELD_QUALITY.STANDARD]: 1.0,
  [STARFIELD_QUALITY.ULTRA]: 1.2
} as const;

export const STAR_DRAW_INTERVAL_BY_QUALITY = {
  [STARFIELD_QUALITY.OFF]: 0,
  [STARFIELD_QUALITY.ECO]: 30, // Draw every 30ms (approx 33 FPS)
  [STARFIELD_QUALITY.STANDARD]: 16, // Draw every 16ms (approx 60 FPS)
  [STARFIELD_QUALITY.ULTRA]: 8 // Draw every 8ms (approx 120 FPS)
} as const;

export const THRUST_SHAKE_DURATION_MS = 150; // Duration of thrust shake effect

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
  POSTURE: 'deepwork-posture-storage',
  FOCUS_BOOSTER: 'deepwork-focus-booster-storage',
  DARK_MODE: 'darkMode',
  WARP_MODE: 'warpMode',
  STARFIELD_QUALITY: 'starfieldQuality',
  LAST_DIFFICULTY: 'lastDifficulty',
  TOTAL_STREAK_SESSIONS: 'totalStreakSessions',
  POSTURE_TRACKING_ACTIVE: 'postureTrackingActive',
  NOTEPAD: 'notepad',
  TODO: 'todo',
  // New: Missions persistence (Zustand persist key)
  MISSIONS: 'deepwork-missions-storage',
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
  BG_BLACK: 'bg-black',
  THRUST_SHAKE: 'thrust-shake'
} as const;

// ===== TOAST SETTINGS =====
export const TOAST_DURATION_MS = 3000; // Duration to show toast messages 

// ===== FOCUS STATEMENTS =====
export const FOCUS_STATEMENTS = [
  "THIS IS WHAT GRIT LOOKS LIKE",
  "STAY ON MISSION",
  "DOING IT",
  "THIS IS SPARTA",
  "FOCUS FACE",
  "GRINDING",
  "DEEP WORK HAPPENING",
  "FLOW STATE ACTIVATED",
  "EYES ON THE PRIZE",
  "DISTRACTION-FREE ZONE",
  "COMMITTING TO EXCELLENCE",
  "PROGRESS IN MOTION",
  "SHOWING UP FOR YOURSELF",
  "DISCIPLINE OVER MOTIVATION",
  "BUILDING NEURAL PATHWAYS"
]; 