import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { NormalizedLandmark } from '@mediapipe/tasks-vision';
import { STORAGE_KEYS } from '../constants';
import { isGoodPosture } from '@/utils/postureDetect';

// Define the baseline metrics structure (imported from PostureContext)
export interface BaselineMetrics {
  noseY: number;
  noseX: number;
  earShoulderDistX: number;
}

// Define the posture status object structure
export interface PostureStatus {
  isGood: boolean;
  message: string;
}

// Define the angles structure
export interface PostureAngles {
  neckPitch: number;
  torsoAngle: number;
}

// Define the initial state for reuse in reset function and tests
export const initialPostureState = {
  // Detection state
  isDetecting: false,
  isCalibrated: false,
  isCalibrating: false,
  isLoadingDetector: false,
  cameraError: null as string | null,
  countdown: null as number | null,
  
  // Pose data
  rawLandmarks: undefined as NormalizedLandmark[] | undefined,
  baselineMetrics: null as BaselineMetrics | null,
  
  // Posture feedback
  postureStatus: {
    isGood: true,
    message: 'Initializing detector...'
  } as PostureStatus,
  
  // Settings
  sensitivityPercentage: 10, // Default 10%
};

// Define the state and actions
interface PostureState {
  // State properties
  isDetecting: boolean;
  isCalibrated: boolean;
  isCalibrating: boolean;
  isLoadingDetector: boolean;
  cameraError: string | null;
  countdown: number | null;
  rawLandmarks: NormalizedLandmark[] | undefined;
  baselineMetrics: BaselineMetrics | null;
  postureStatus: PostureStatus;
  sensitivityPercentage: number;
  
  // Simple actions (state setters)
  setIsDetecting: (isDetecting: boolean) => void;
  setIsCalibrated: (isCalibrated: boolean) => void;
  setIsCalibrating: (isCalibrating: boolean) => void;
  setIsLoadingDetector: (isLoading: boolean) => void;
  setCameraError: (error: string | null) => void;
  setCountdown: (countdown: number | null) => void;
  setRawLandmarks: (landmarks: NormalizedLandmark[] | undefined) => void;
  setBaselineMetrics: (metrics: BaselineMetrics | null) => void;
  setPostureStatus: (status: PostureStatus) => void;
  setSensitivityPercentage: (percentage: number) => void;
  
  // Complex actions
  startCalibrationSequence: () => void;
  completeCalibration: (metrics: BaselineMetrics) => void;
  clearCalibration: () => void;
  evaluatePosture: (landmarks: NormalizedLandmark[]) => void;
  
  // Reset function for testing
  reset: () => void;
}

// Create the Zustand store
export const usePostureStore = create<PostureState>()(
  persist(
    (set, get) => ({
      // Initial state
      ...initialPostureState,
      
      // Simple actions
      setIsDetecting: (isDetecting) => set({ isDetecting }),
      setIsCalibrated: (isCalibrated) => set({ isCalibrated }),
      setIsCalibrating: (isCalibrating) => set({ isCalibrating }),
      setIsLoadingDetector: (isLoading) => set({ isLoadingDetector: isLoading }),
      setCameraError: (error) => set({ cameraError: error }),
      setCountdown: (countdown) => set({ countdown }),
      
      // Enhanced setRawLandmarks that triggers posture evaluation
      setRawLandmarks: (landmarks) => {
        console.log('[postureSlice] Action: setRawLandmarks called with landmarks:', landmarks ? 'landmarks present' : 'undefined');
        
        set({ rawLandmarks: landmarks });
        
        // If we have landmarks, calibration is complete, and detection is active, evaluate posture
        if (landmarks && get().isCalibrated && get().baselineMetrics && get().isDetecting && !get().isCalibrating) {
          console.log('[postureSlice] Conditions met for auto-evaluation after landmark update');
          get().evaluatePosture(landmarks);
        } else {
          console.log('[postureSlice] Skipping auto-evaluation. isCalibrated:', get().isCalibrated, 
            'baselineMetrics:', get().baselineMetrics ? 'present' : 'null', 
            'isDetecting:', get().isDetecting,
            'isCalibrating:', get().isCalibrating);
        }
      },
      
      setBaselineMetrics: (metrics) => {
        console.log('[postureSlice] Action: setBaselineMetrics called with metrics:', metrics);
        set({ baselineMetrics: metrics });
      },
      
      setPostureStatus: (status) => {
        console.log('[postureSlice] Action: setPostureStatus called with status:', status);
        set({ postureStatus: status });
      },
      
      setSensitivityPercentage: (percentage) => {
        console.log('[postureSlice] Action: setSensitivityPercentage called with percentage:', percentage);
        set({ sensitivityPercentage: percentage });
        
        // Re-evaluate posture with new sensitivity if we're calibrated and have landmarks
        const state = get();
        if (state.isCalibrated && state.baselineMetrics && state.rawLandmarks && state.isDetecting) {
          console.log('[postureSlice] Re-evaluating posture after sensitivity change');
          get().evaluatePosture(state.rawLandmarks);
        }
      },
      
      // New action to evaluate posture with current landmarks and baseline
      evaluatePosture: (landmarks) => {
        const state = get();
        
        if (!state.isCalibrated || !state.baselineMetrics) {
          console.log('[postureSlice] evaluatePosture called but not calibrated or no baseline metrics');
          return;
        }
        
        console.log('[postureSlice] Calling isGoodPosture with: landmarks present, baseline:', 
          JSON.stringify(state.baselineMetrics), 
          'sensitivity:', state.sensitivityPercentage);
        
        const status = isGoodPosture(landmarks, state.baselineMetrics, state.sensitivityPercentage);
        
        console.log('[postureSlice] isGoodPosture returned:', JSON.stringify(status));
        
        set({ postureStatus: status });
      },
      
      // Complex actions
      startCalibrationSequence: () => {
        const state = get();
        
        // Only start if not already calibrating and landmarks are available
        if (state.isCalibrating || !state.rawLandmarks || state.rawLandmarks.length === 0) {
          console.log("[postureSlice] Cannot start calibration: already calibrating or no landmarks available");
          return;
        }
        
        set({ 
          isCalibrating: true, 
          isCalibrated: false,
          countdown: 3,
          postureStatus: { isGood: true, message: "Calibrating... 3" }
        });
        
        console.log("[postureSlice] Started calibration sequence with countdown");
      },
      
      completeCalibration: (metrics) => {
        console.log("[postureSlice] Completing calibration with metrics:", metrics);
        
        set({ 
          baselineMetrics: metrics,
          isCalibrated: true,
          isCalibrating: false,
          countdown: null,
          postureStatus: { isGood: true, message: "Posture OK!" }
        });
        
        // If we have current landmarks, immediately evaluate posture with the new baseline
        const state = get();
        if (state.rawLandmarks && state.rawLandmarks.length > 0) {
          console.log("[postureSlice] Evaluating posture immediately after calibration");
          setTimeout(() => {
            get().evaluatePosture(state.rawLandmarks!);
          }, 100); // Small delay to ensure state is updated
        }
      },
      
      clearCalibration: () => {
        set({
          baselineMetrics: null,
          isCalibrated: false,
          postureStatus: { isGood: true, message: "Calibration cleared" }
        });
        
        console.log("[postureSlice] Calibration cleared");
      },
      
      // Reset function for testing
      reset: () => set(initialPostureState),
    }),
    {
      name: STORAGE_KEYS.POSTURE, // Add this key to constants.ts
      partialize: (state) => ({
        // Only persist these values in localStorage
        baselineMetrics: state.baselineMetrics,
        sensitivityPercentage: state.sensitivityPercentage,
        isCalibrated: state.isCalibrated
      }),
    }
  )
); 