import { useState, useEffect, useCallback } from 'react';
import { NormalizedLandmark } from '@mediapipe/tasks-vision';
import { POSE_LANDMARKS } from '@/utils/postureDetect';
import { usePostureStore } from '@/store/postureSlice';
import { usePosture } from '@/context/PostureContext';
import { STORAGE_KEYS } from '@/constants';

interface StablePostureResult {
  good: boolean;
  isActive: boolean;
  baselineEye: number | null;
  eyeY: number | null;
  landmarks: NormalizedLandmark[] | undefined;
  toggleActive: () => void;
  calibrate: () => void;
  startDetection: () => Promise<void>;
  stopDetection: () => void;
}

export const useStablePosture = (initialActive = true, sensitivityFactor = 1.0): StablePostureResult => {
  // Use the centralized posture store and context
  const postureStore = usePostureStore();
  const postureContext = usePosture();
  
  // Track local active state (whether posture detection is being used)
  const [isActive, setIsActive] = useState(() => {
    const storedValue = localStorage.getItem(STORAGE_KEYS.POSTURE_TRACKING_ACTIVE);
    return storedValue ? storedValue === 'true' : initialActive;
  });

  // Update localStorage when isActive changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.POSTURE_TRACKING_ACTIVE, isActive.toString());
  }, [isActive]);

  // Set adjusted sensitivity when sensitivityFactor changes
  useEffect(() => {
    // Convert the factor to a percentage (1.0 = 10%)
    const adjustedSensitivity = Math.round(sensitivityFactor * 10);
    postureStore.setSensitivityPercentage(adjustedSensitivity);
  }, [sensitivityFactor, postureStore]);

  // Compute baselineEye and eyeY based on landmarks from the store
  const baselineEye = postureStore.isCalibrated && postureStore.baselineMetrics 
    ? postureStore.baselineMetrics.noseY
    : null;
    
  const eyeY = postureStore.rawLandmarks && postureStore.rawLandmarks.length > 0 
    ? postureStore.rawLandmarks[POSE_LANDMARKS.NOSE]?.y || null 
    : null;

  // Toggle active state
  const toggleActive = useCallback(() => {
    setIsActive(prev => !prev);
  }, []);

  // Start detection - now delegates to context's startPostureDetection
  const startDetection = useCallback(async () => {
    if (isActive) {
      await postureContext.startPostureDetection();
    }
  }, [isActive, postureContext]);

  // Stop detection - delegates to context's stopPostureDetection
  const stopDetection = useCallback(() => {
    postureContext.stopPostureDetection();
  }, [postureContext]);

  // Calibrate posture - delegates to context's handleCalibration
  const calibrate = useCallback(() => {
    postureContext.handleCalibration();
  }, [postureContext]);

  return {
    good: isActive && postureStore.postureStatus.isGood,
    isActive,
    baselineEye,
    eyeY,
    landmarks: postureStore.rawLandmarks,
    toggleActive,
    calibrate,
    startDetection,
    stopDetection
  };
}; 