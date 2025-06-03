import { useState, useEffect, useRef, useCallback } from 'react';
import { NormalizedLandmark } from '@mediapipe/tasks-vision';
import poseDetector from '@/lib/poseDetector';
import { POSE_LANDMARKS, isGoodPosture } from '@/utils/postureDetect';
import { usePostureStore, BaselineMetrics } from '@/store/postureSlice';
import { STORAGE_KEYS } from '@/constants';

interface StablePostureResult {
  good: boolean;
  isActive: boolean;
  baselineEye: number | null;
  eyeY: number | null;
  landmarks: NormalizedLandmark[] | undefined;
  toggleActive: () => void;
  calibrate: () => void;
  startDetection: (videoElement: HTMLVideoElement) => void;
  stopDetection: () => void;
}

export const useStablePosture = (initialActive = true, sensitivityFactor = 1.0): StablePostureResult => {
  // Reference to the video element
  const videoRef = useRef<HTMLVideoElement | null>(null);
  // Reference to keep track of interval IDs
  const intervalRef = useRef<number | null>(null);

  // Use the posture store for state management
  const postureStore = usePostureStore();
  
  // Track local active state (whether posture detection is being used)
  const [isActive, setIsActive] = useState(() => {
    const storedValue = localStorage.getItem(STORAGE_KEYS.POSTURE_TRACKING_ACTIVE);
    return storedValue ? storedValue === 'true' : initialActive;
  });

  // Update localStorage when isActive changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.POSTURE_TRACKING_ACTIVE, isActive.toString());
  }, [isActive]);

  // Compute baselineEye and eyeY based on landmarks
  const baselineEye = postureStore.isCalibrated && postureStore.baselineMetrics 
    ? postureStore.baselineMetrics.noseY
    : null;
    
  const eyeY = postureStore.rawLandmarks && postureStore.rawLandmarks.length > 0 
    ? postureStore.rawLandmarks[POSE_LANDMARKS.NOSE]?.y || null 
    : null;

  // Handler for pose detection results
  const handlePoseResults = useCallback((landmarks: NormalizedLandmark[]) => {
    if (landmarks && landmarks.length > 0) {
      postureStore.setRawLandmarks(landmarks);
      
      // If calibrated, check posture with the specified sensitivity factor
      if (postureStore.isCalibrated && postureStore.baselineMetrics) {
        const adjustedSensitivity = Math.round(sensitivityFactor * 10);
        const status = isGoodPosture(landmarks, postureStore.baselineMetrics, adjustedSensitivity);
        postureStore.setPostureStatus(status);
      }
    }
  }, [postureStore, sensitivityFactor]);

  // Adapter function for the poseDetector callback
  const detectorCallback = useCallback((result: any, timestampMs: number) => {
    if (result.landmarks && result.landmarks.length > 0) {
      handlePoseResults(result.landmarks[0]);
    }
  }, [handlePoseResults]);

  // Start detection with a video element
  const startDetection = useCallback(async (videoElement: HTMLVideoElement) => {
    if (!videoElement) {
      console.error('No video element provided to startDetection');
      return;
    }
    
    videoRef.current = videoElement;
    postureStore.setIsLoadingDetector(true);
    
    try {
      // Initialize detector if needed
      if (!poseDetector['poseLandmarker']) {
        await poseDetector.initialize(undefined, detectorCallback);
      }
      
      // Set up the detection interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      
      intervalRef.current = window.setInterval(() => {
        if (videoElement && videoElement.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
          try {
            poseDetector.detect(videoElement, performance.now());
          } catch (err) {
            console.error('Error in pose detection:', err);
          }
        }
      }, 100);
      
      postureStore.setIsDetecting(true);
    } catch (err) {
      console.error('Failed to initialize pose detector:', err);
      postureStore.setCameraError(`Pose detector init error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      postureStore.setIsLoadingDetector(false);
    }
  }, [detectorCallback, postureStore]);

  // Stop detection
  const stopDetection = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    postureStore.setIsDetecting(false);
    postureStore.setRawLandmarks(undefined);
  }, [postureStore]);

  // Toggle active state
  const toggleActive = useCallback(() => {
    setIsActive(prev => !prev);
  }, []);

  // Calibrate posture
  const calibrate = useCallback(() => {
    const landmarks = postureStore.rawLandmarks;
    
    if (landmarks && landmarks.length > 0) {
      const nose = landmarks[POSE_LANDMARKS.NOSE];
      const leftEar = landmarks[POSE_LANDMARKS.LEFT_EAR];
      const leftShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
      
      if (nose?.y && leftEar?.x && leftShoulder?.x) {
        const metrics: BaselineMetrics = {
          noseY: nose.y,
          noseX: nose.x,
          earShoulderDistX: Math.abs(leftEar.x - leftShoulder.x)
        };
        
        postureStore.completeCalibration(metrics);
      }
    }
  }, [postureStore]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

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