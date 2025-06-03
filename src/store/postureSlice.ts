import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { NormalizedLandmark } from '@mediapipe/tasks-vision';
import { STORAGE_KEYS } from '../constants';

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
  
  // Reset function for testing
  reset: () => void;
}

// Create the Zustand store
export const usePostureStore = create<PostureState>()(
  persist(
    (set) => ({
      // Initial state
      ...initialPostureState,
      
      // Simple actions
      setIsDetecting: (isDetecting) => set({ isDetecting }),
      setIsCalibrated: (isCalibrated) => set({ isCalibrated }),
      setIsCalibrating: (isCalibrating) => set({ isCalibrating }),
      setIsLoadingDetector: (isLoading) => set({ isLoadingDetector: isLoading }),
      setCameraError: (error) => set({ cameraError: error }),
      setCountdown: (countdown) => set({ countdown }),
      setRawLandmarks: (landmarks) => set({ rawLandmarks: landmarks }),
      setBaselineMetrics: (metrics) => set({ baselineMetrics: metrics }),
      setPostureStatus: (status) => set({ postureStatus: status }),
      setSensitivityPercentage: (percentage) => set({ sensitivityPercentage: percentage }),
      
      // Complex actions
      startCalibrationSequence: () => {
        const state = usePostureStore.getState();
        
        // Only start if not already calibrating and landmarks are available
        if (state.isCalibrating || !state.rawLandmarks || state.rawLandmarks.length === 0) {
          console.log("Cannot start calibration: already calibrating or no landmarks available");
          return;
        }
        
        set({ 
          isCalibrating: true, 
          isCalibrated: false,
          countdown: 3,
          postureStatus: { isGood: true, message: "Calibrating... 3" }
        });
        
        console.log("Started calibration sequence with countdown");
      },
      
      completeCalibration: (metrics) => {
        set({ 
          baselineMetrics: metrics,
          isCalibrated: true,
          isCalibrating: false,
          countdown: null,
          postureStatus: { isGood: true, message: "Posture OK!" }
        });
        
        console.log("Completed calibration with metrics:", metrics);
      },
      
      clearCalibration: () => {
        set({
          baselineMetrics: null,
          isCalibrated: false,
          postureStatus: { isGood: true, message: "Calibration cleared" }
        });
        
        console.log("Calibration cleared");
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