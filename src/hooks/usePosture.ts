import { useEffect, useRef, useState } from 'react';
import { Pose, Results } from '@mediapipe/pose';
import { Camera } from '@mediapipe/camera_utils';
import { Landmarks } from '../utils/poseMath';
import { detectPostureWithBaseline } from '../utils/postureDetect';
import { NormalizedLandmark } from '@mediapipe/tasks-vision';

export interface PoseData {
  good: boolean;
  landmarks?: Landmarks;
  eyeY: number | null;
  message: string;
  angles: {
    neckPitch: number;
    torsoAngle: number;
  };
}

export interface PostureHook extends PoseData {
  calibratePosture: () => void;
  startDetection: (video: HTMLVideoElement) => void;
  isActive: boolean;
  toggleActive: () => void;
}

export function usePosture(_enabled = true, sensitivityThreshold = 1.0): PostureHook {
  const [poseData, setPoseData] = useState<PoseData>({
    good: true,
    landmarks: undefined,
    eyeY: null,
    message: "No baseline set",
    angles: {
      neckPitch: 0,
      torsoAngle: 0
    }
  });
  const [poseInstance, setPoseInstance] = useState<Pose | null>(null);
  const [cameraInstance, setCameraInstance] = useState<Camera | null>(null);
  const [isActive, setIsActive] = useState<boolean>(() => {
    const storedValue = localStorage.getItem('postureTrackingActive');
    return storedValue ? storedValue === 'true' : true;
  });
  
  const baselineRef = useRef<Landmarks | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const latestLandmarksRef = useRef<Landmarks | null>(null);
  
  // Initialize pose detection - always initialize regardless of enabled state
  useEffect(() => {
    const pose = new Pose({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
      }
    });

    pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      smoothSegmentation: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    pose.onResults((results: Results) => {
      if (!results.poseLandmarks) {
        setPoseData(prev => ({
          ...prev,
          good: true, // Assume good when no detection
          landmarks: undefined,
          message: "No pose detected"
        }));
        return;
      }

      // Get the landmarks
      const landmarks = results.poseLandmarks as unknown as Landmarks;
      
      // Check if we have baseline landmarks
      if (baselineRef.current) {
        // Use the detector
        const postureResult = detectPostureWithBaseline(
          landmarks as unknown as NormalizedLandmark[], // Type cast to resolve the issue
          baselineRef.current as unknown as NormalizedLandmark[],
          sensitivityThreshold * 100 // Convert to percentage
        );

        // Update the pose data with the detection result
        setPoseData({
          good: postureResult.good,
          landmarks,
          eyeY: landmarks[10]?.y || null, // Use eye landmark
          message: postureResult.message,
          angles: postureResult.angles
        });
      } else {
        // No baseline yet
        setPoseData({
          good: true, // Assume good when no baseline
          landmarks,
          eyeY: landmarks[10]?.y || null, // Use eye landmark
          message: "No baseline set",
          angles: {
            neckPitch: 0,
            torsoAngle: 0
          }
        });
      }
    });

    setPoseInstance(pose);

    return () => {
      pose.close();
      if (cameraInstance) {
        cameraInstance.stop();
      }
    };
  }, []);

  // Function to calibrate posture - now uses latestLandmarks
  const calibratePosture = () => {
    if (latestLandmarksRef.current) {
      baselineRef.current = latestLandmarksRef.current;
      console.log("Baseline set:", baselineRef.current.length);
    } else {
      console.warn("Cannot calibrate - no landmarks detected yet");
      alert('Hold still a moment until landmarks appear, then try again.');
    }
  };

  // Function to start pose detection on a video element
  const startDetection = (video: HTMLVideoElement) => {
    if (!poseInstance) return;
    
    videoRef.current = video;
    console.log("Starting pose detection on video element");
    
    // Use MediaPipe Camera utility for more efficient frame processing
    const camera = new Camera(video, {
      onFrame: async () => {
        if (videoRef.current && poseInstance) {
          await poseInstance.send({ image: videoRef.current });
        }
      },
      width: 640,
      height: 480
    });
    
    camera.start()
      .then(() => {
        console.log("Camera started successfully");
        setCameraInstance(camera);
      })
      .catch(err => console.error("Error starting camera:", err));
  };

  // Function to toggle posture tracking active state
  const toggleActive = () => {
    setIsActive(prev => {
      const newValue = !prev;
      localStorage.setItem('postureTrackingActive', newValue.toString());
      return newValue;
    });
  };

  return {
    ...poseData,
    calibratePosture,
    startDetection,
    isActive,
    toggleActive
  };
} 