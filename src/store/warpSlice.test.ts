import { describe, it, expect, beforeEach } from 'vitest';
import { useWarpStore, initialWarpState } from './warpSlice';
import { WARP_MODE } from '../constants';
import { act } from '@testing-library/react';

describe('warpSlice', () => {
  // Reset the store before each test
  beforeEach(() => {
    act(() => {
      useWarpStore.getState().reset();
    });
  });
  
  it('should initialize with the correct default values', () => {
    const state = useWarpStore.getState();
    
    // Check if state matches initialWarpState
    expect(state.warpMode).toBe(initialWarpState.warpMode);
    expect(state.speedMultiplier).toBe(initialWarpState.speedMultiplier);
    expect(state.showExitButton).toBe(initialWarpState.showExitButton);
    expect(state.showDistractionInWarp).toBe(initialWarpState.showDistractionInWarp);
  });
  
  it('should update warpMode correctly', () => {
    const { setWarpMode } = useWarpStore.getState();
    
    // Initially 'background' (changed from 'none' to match new default)
    expect(useWarpStore.getState().warpMode).toBe(WARP_MODE.BACKGROUND);
    
    // Set to 'none'
    act(() => {
      setWarpMode(WARP_MODE.NONE);
    });
    expect(useWarpStore.getState().warpMode).toBe(WARP_MODE.NONE);
    
    // Set to 'full'
    act(() => {
      setWarpMode(WARP_MODE.FULL);
    });
    expect(useWarpStore.getState().warpMode).toBe(WARP_MODE.FULL);
    
    // Set back to 'background'
    act(() => {
      setWarpMode(WARP_MODE.BACKGROUND);
    });
    expect(useWarpStore.getState().warpMode).toBe(WARP_MODE.BACKGROUND);
  });
  
  it('should update speedMultiplier correctly', () => {
    const { setSpeedMultiplier } = useWarpStore.getState();
    const newMultiplier = 0.5; // Value between 0.1 and 1.0
    
    // Check initial value
    expect(useWarpStore.getState().speedMultiplier).toBe(initialWarpState.speedMultiplier);
    
    // Update multiplier
    act(() => {
      setSpeedMultiplier(newMultiplier);
    });
    expect(useWarpStore.getState().speedMultiplier).toBe(newMultiplier);
  });
  
  it('should update showExitButton correctly', () => {
    const { setShowExitButton } = useWarpStore.getState();
    
    // Initially false
    expect(useWarpStore.getState().showExitButton).toBe(false);
    
    // Set to true
    act(() => {
      setShowExitButton(true);
    });
    expect(useWarpStore.getState().showExitButton).toBe(true);
    
    // Set back to false
    act(() => {
      setShowExitButton(false);
    });
    expect(useWarpStore.getState().showExitButton).toBe(false);
  });
  
  it('should update showDistractionInWarp correctly', () => {
    const { setShowDistractionInWarp } = useWarpStore.getState();
    
    // Initially false
    expect(useWarpStore.getState().showDistractionInWarp).toBe(false);
    
    // Set to true
    act(() => {
      setShowDistractionInWarp(true);
    });
    expect(useWarpStore.getState().showDistractionInWarp).toBe(true);
    
    // Set back to false
    act(() => {
      setShowDistractionInWarp(false);
    });
    expect(useWarpStore.getState().showDistractionInWarp).toBe(false);
  });
}); 