import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore, initialAppState } from './appSlice';
import { act } from '@testing-library/react';

describe('appSlice', () => {
  // Reset the store before each test
  beforeEach(() => {
    act(() => {
      useAppStore.getState().reset();
    });
  });

  it('should initialize with the correct default values', () => {
    const state = useAppStore.getState();
    
    // Check if the state matches the initialAppState
    expect(state.performanceMode).toBe(initialAppState.performanceMode);
    expect(state.sfxVolume).toBe(initialAppState.sfxVolume);
    expect(state.musicVolume).toBe(initialAppState.musicVolume);
    expect(state.pwaInstallPromptShown).toBe(initialAppState.pwaInstallPromptShown);
    expect(state.isDarkMode).toBe(initialAppState.isDarkMode);
    expect(state.currentMode).toBe(initialAppState.currentMode);
  });

  it('should update performanceMode correctly', () => {
    const { setPerformanceMode } = useAppStore.getState();
    
    // Initially false
    expect(useAppStore.getState().performanceMode).toBe(false);
    
    // Set to true
    act(() => {
      setPerformanceMode(true);
    });
    expect(useAppStore.getState().performanceMode).toBe(true);
    
    // Set back to false
    act(() => {
      setPerformanceMode(false);
    });
    expect(useAppStore.getState().performanceMode).toBe(false);
  });

  it('should update sfxVolume correctly', () => {
    const { setSfxVolume } = useAppStore.getState();
    const newVolume = 0.5;
    
    // Check initial value
    expect(useAppStore.getState().sfxVolume).toBe(initialAppState.sfxVolume);
    
    // Update volume
    act(() => {
      setSfxVolume(newVolume);
    });
    expect(useAppStore.getState().sfxVolume).toBe(newVolume);
  });

  it('should update musicVolume correctly', () => {
    const { setMusicVolume } = useAppStore.getState();
    const newVolume = 0.3;
    
    // Check initial value
    expect(useAppStore.getState().musicVolume).toBe(initialAppState.musicVolume);
    
    // Update volume
    act(() => {
      setMusicVolume(newVolume);
    });
    expect(useAppStore.getState().musicVolume).toBe(newVolume);
  });

  it('should update dark mode correctly', () => {
    const { setDarkMode } = useAppStore.getState();
    const initialValue = useAppStore.getState().isDarkMode;
    
    // Toggle dark mode
    act(() => {
      setDarkMode(!initialValue);
    });
    expect(useAppStore.getState().isDarkMode).toBe(!initialValue);
    
    // Toggle back
    act(() => {
      setDarkMode(initialValue);
    });
    expect(useAppStore.getState().isDarkMode).toBe(initialValue);
  });

  it('should update currentMode correctly', () => {
    const { setCurrentMode } = useAppStore.getState();
    
    // Initial value should be 'standby'
    expect(useAppStore.getState().currentMode).toBe('standby');
    
    // Set to 'focus'
    act(() => {
      setCurrentMode('focus');
    });
    expect(useAppStore.getState().currentMode).toBe('focus');
    
    // Set to 'warp'
    act(() => {
      setCurrentMode('warp');
    });
    expect(useAppStore.getState().currentMode).toBe('warp');
  });

  it('should track PWA install prompt state correctly', () => {
    const { setPwaInstallPromptShown } = useAppStore.getState();
    
    // Initial value should be false
    expect(useAppStore.getState().pwaInstallPromptShown).toBe(false);
    
    // Set to true
    act(() => {
      setPwaInstallPromptShown(true);
    });
    expect(useAppStore.getState().pwaInstallPromptShown).toBe(true);
  });
}); 