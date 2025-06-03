import React, {
  createContext,
  useContext,
  useRef,
  useEffect,
  useCallback,
} from "react";
// Import poseDetector
import poseDetector from "@/lib/poseDetector";
import {
  PoseLandmarkerResult
} from "@mediapipe/tasks-vision";
import { POSE_LANDMARKS } from "@/utils/postureDetect";
// Import the postureSlice
import { usePostureStore, BaselineMetrics } from "@/store/postureSlice";

// Simplified context that mainly handles camera/detector functionality
interface PostureContextType {
  videoRef: React.RefObject<HTMLVideoElement>;
  startPostureDetection: () => Promise<void>;
  stopPostureDetection: () => void;
  handleCalibration: () => void;
}

const PostureContext = createContext<PostureContextType | undefined>(undefined);

export const PostureProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // Keep video reference in context
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Reference to interval for detection
  const intervalIdRef = useRef<number | null>(null);
  
  // Reference to interval for calibration countdown
  const calibrationTimerRef = useRef<number | null>(null);
  
  // Reference to detecting state for cleanup
  const detectingRef = useRef<boolean>(false);
  
  // Get state and actions from Zustand store
  const postureStore = usePostureStore();
  
  // Create handler for pose detection results
  const handlePoseResults = useCallback(
    (result: PoseLandmarkerResult, _: number) => {
      // Update landmarks in store
      if (result.landmarks && result.landmarks.length > 0) {
        const newLandmarksFromDetector = result.landmarks[0];
        console.log('[PostureContext] Raw landmarks from detector received, count:', newLandmarksFromDetector.length);
        console.log('[PostureContext] Current state - isCalibrated:', postureStore.isCalibrated, 'isDetecting:', postureStore.isDetecting);
        
        // Just update landmarks in the store - the store will handle evaluation
        postureStore.setRawLandmarks(newLandmarksFromDetector);
        
        // No need to call isGoodPosture here, as postureSlice will handle it in setRawLandmarks
      } else {
        console.log('[PostureContext] No landmarks received from detector');
        postureStore.setRawLandmarks(undefined);
        if (postureStore.isCalibrated) {
          console.log('[PostureContext] Setting status to "No person detected"');
          postureStore.setPostureStatus({ isGood: false, message: "No person detected." });
        } else if (!postureStore.isCalibrating) {
          console.log('[PostureContext] Setting status to "Initializing detector..."');
          postureStore.setPostureStatus({ isGood: true, message: "Initializing detector..." });
        }
      }
    },
    [postureStore]
  );
  
  // Setup pose detector
  const setupPoseDetector = useCallback(async () => {
    postureStore.setIsLoadingDetector(true);
    postureStore.setCameraError(null);
    try {
      await poseDetector.initialize(undefined, handlePoseResults); 
      console.log("Pose detector initialized in context.");
    } catch (error) {
      console.error("Error initializing pose detector in context:", error);
      postureStore.setCameraError(
        `Failed to initialize pose detector: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    } finally {
      postureStore.setIsLoadingDetector(false);
    }
  }, [handlePoseResults, postureStore]);

  // Handle calibration process
  const handleCalibration = () => {
    if (calibrationTimerRef.current) {
      console.log("CONTEXT: Calibration already in progress.");
      return; 
    }
    
    if (postureStore.isDetecting && !postureStore.isLoadingDetector && !postureStore.cameraError) {
      const currentLandmarks = postureStore.rawLandmarks;

      if (currentLandmarks && currentLandmarks.length > 0) {
        console.log("CONTEXT: Starting calibration countdown...");
        postureStore.setIsCalibrating(true);
        postureStore.setIsCalibrated(false);
        postureStore.setCountdown(3);
        postureStore.setPostureStatus({ isGood: true, message: "Calibrating... 3" });

        let currentCountdown = 3;
        calibrationTimerRef.current = window.setInterval(() => {
          currentCountdown -= 1;
          postureStore.setCountdown(currentCountdown);

          if (currentCountdown > 0) {
            postureStore.setPostureStatus({ isGood: true, message: `Calibrating... ${currentCountdown}` });
          } else {
            // Countdown finished
            if (calibrationTimerRef.current) clearInterval(calibrationTimerRef.current);
            calibrationTimerRef.current = null;
            postureStore.setPostureStatus({ isGood: true, message: `Capturing...` }); 
            postureStore.setCountdown(null);

            console.log("CONTEXT: Capturing baseline metrics after countdown...");
            const currentLandmarksAtCapture = postureStore.rawLandmarks;
            const nose = currentLandmarksAtCapture?.[POSE_LANDMARKS.NOSE];
            const leftEar = currentLandmarksAtCapture?.[POSE_LANDMARKS.LEFT_EAR];
            const leftShoulder = currentLandmarksAtCapture?.[POSE_LANDMARKS.LEFT_SHOULDER];

            // Calculate baseline metrics
            if (currentLandmarksAtCapture && nose?.x && nose?.y && leftEar?.x && leftShoulder?.x) { 
              const metrics: BaselineMetrics = {
                noseY: nose.y,
                noseX: nose.x,
                earShoulderDistX: Math.abs(leftEar.x - leftShoulder.x)
              };
              
              // Use store action to complete calibration
              postureStore.completeCalibration(metrics);
              
              // No need to check posture immediately here, the store will handle it in completeCalibration
              console.log("CONTEXT: Calibration complete. Metrics:", metrics);
            } else {
              console.warn("CONTEXT: Could not calculate baseline metrics - missing required landmarks.");
              postureStore.setPostureStatus({ isGood: false, message: "Calibration failed: landmarks lost." });
              postureStore.setIsCalibrated(false);
              postureStore.setIsCalibrating(false);
              postureStore.setBaselineMetrics(null);
            }
          }
        }, 1000);
      } else {
        console.warn("CONTEXT: Calibration attempt failed: Required landmarks missing.");
        postureStore.setPostureStatus({ isGood: false, message: "Cannot calibrate - landmarks missing." });
        postureStore.setIsCalibrating(false);
      }
    } else {
      console.warn("CONTEXT: Cannot calibrate - detection not active or ready.");
      postureStore.setPostureStatus({ isGood: false, message: "Cannot calibrate - detector not ready." });
    }
  };

  // Start posture detection
  const startPostureDetection = async () => {
    if (!videoRef.current) {
      postureStore.setCameraError("Video element not available.");
      return;
    }
    
    postureStore.setIsLoadingDetector(true);
    postureStore.setCameraError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 }, 
      });
      
      videoRef.current.srcObject = stream;
      
      await new Promise<void>((resolve, reject) => { 
        if (videoRef.current) {
          videoRef.current.onloadedmetadata = () => resolve();
          videoRef.current.onerror = () => reject(new Error("Video load error"));
        } else {
          reject(new Error("Video element not available for metadata load"));
        }
      });
      
      if (videoRef.current) {
        await videoRef.current.play();
        console.log("Camera stream started.");
      } else {
        throw new Error("Video element became unavailable after metadata load.");
      }
      
      if (!poseDetector['poseLandmarker']) { 
        console.log("Detector not yet initialized, initializing now...");
        await setupPoseDetector(); 
      }
      
      if (!poseDetector['poseLandmarker']) {
        throw new Error("Pose detector could not be initialized after attempt.");
      }

      console.log("CONTEXT: Posture detection starting interval (500ms).");
      postureStore.setIsDetecting(true);
      detectingRef.current = true;
      postureStore.setIsLoadingDetector(false);

      if (intervalIdRef.current) clearInterval(intervalIdRef.current);

      intervalIdRef.current = window.setInterval(() => {
        if (detectingRef.current && videoRef.current && videoRef.current.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && videoRef.current.videoWidth > 0) {
          const now = performance.now();
          poseDetector.detect(videoRef.current, now);
        } else if (!detectingRef.current) {
          if (intervalIdRef.current) clearInterval(intervalIdRef.current);
          intervalIdRef.current = null;
        }
      }, 500);

    } catch (err) {
      console.error("Error starting posture detection:", err);
      postureStore.setCameraError(
        `Error accessing camera or starting detection: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
      postureStore.setIsDetecting(false);
      detectingRef.current = false;
      postureStore.setIsLoadingDetector(false);
      
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
    }
  };

  // Stop posture detection
  const stopPostureDetection = () => {
    console.log("CONTEXT: Stopping posture detection.");
    detectingRef.current = false;
    postureStore.setIsDetecting(false);

    if (intervalIdRef.current) { 
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
      console.log("CONTEXT: Detection interval cleared.");
    }
    
    if (calibrationTimerRef.current) { 
      clearInterval(calibrationTimerRef.current);
      calibrationTimerRef.current = null;
      console.log("CONTEXT: Calibration timer cleared during stop.");
    }
    
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => {
        console.log("Stopping track:", track.kind, track.label);
        track.stop(); 
      });
      videoRef.current.srcObject = null;
      console.log("CONTEXT: Camera stream stopped and srcObject cleared.");
    } else {
      console.log("CONTEXT: No active stream found to stop.");
    }

    postureStore.setRawLandmarks(undefined);
    postureStore.setIsCalibrated(false);
    postureStore.setBaselineMetrics(null);
    postureStore.setIsCalibrating(false);
    postureStore.setCountdown(null);
    postureStore.setPostureStatus({ isGood: true, message: "Detection stopped." });
  };
  
  // Initialize detector when component mounts
  useEffect(() => {
    if (videoRef.current && !poseDetector['poseLandmarker'] && !postureStore.isLoadingDetector) {
      setupPoseDetector();
    }
  }, [postureStore.isLoadingDetector, setupPoseDetector]); 

  // Cleanup on unmount
  useEffect(() => {
    return () => { 
      console.log("CONTEXT: PostureProvider unmounting cleanup.");
      if (calibrationTimerRef.current) {
        clearInterval(calibrationTimerRef.current);
      }
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
      }
      
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
        console.log("Camera stream stopped during unmount cleanup.");
      } 
      
      if (poseDetector && typeof poseDetector.close === 'function') {
        poseDetector.close(); 
        console.log("CONTEXT: Pose detector closed during unmount cleanup.");
      }
    };
  }, []);

  return (
    <PostureContext.Provider
      value={{
        videoRef,
        startPostureDetection,
        stopPostureDetection,
        handleCalibration,
      }}
    >
      {children}
    </PostureContext.Provider>
  );
};

// Custom hook to use the posture context
export const usePosture = () => {
  const context = useContext(PostureContext);
  const postureStore = usePostureStore();
  
  if (context === undefined) {
    throw new Error("usePosture must be used within a PostureProvider");
  }
  
  // Combine context and store into a unified API
  return {
    // From context (camera/detector operations)
    videoRef: context.videoRef,
    startPostureDetection: context.startPostureDetection,
    stopPostureDetection: context.stopPostureDetection,
    handleCalibration: context.handleCalibration,
    
    // From store (state)
    isDetecting: postureStore.isDetecting,
    detectedLandmarks: postureStore.rawLandmarks,
    baselineMetrics: postureStore.baselineMetrics,
    cameraError: postureStore.cameraError,
    postureStatus: postureStore.postureStatus,
    isCalibrated: postureStore.isCalibrated,
    isCalibrating: postureStore.isCalibrating,
    isLoadingDetector: postureStore.isLoadingDetector,
    countdown: postureStore.countdown,
    sensitivityPercentage: postureStore.sensitivityPercentage,
    setSensitivityPercentage: postureStore.setSensitivityPercentage,
  };
}; 