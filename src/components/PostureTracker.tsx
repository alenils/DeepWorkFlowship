import React, { useState, useEffect, useRef } from 'react';
import { useStablePosture } from '../hooks/useStablePosture';
import { PoseLandmarksRenderer } from './PoseLandmarksRenderer';
import { PoseOverlay } from './PoseOverlay';
import PostureView from "./PostureView";
import PostureControls from "./PostureControls";
import PostureStatusDisplay from "./PostureStatusDisplay";

interface PostureTrackerProps {
  isSessionActive?: boolean;
  onPostureChange?: (isGood: boolean) => void;
  sensitivity?: number;
}

const PostureTrackerComponent = ({ 
  isSessionActive = false, 
  onPostureChange = (_: boolean) => {},
  sensitivity = 1.0
}: PostureTrackerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraEnabled] = useState(true);
  const streamRef = useRef<MediaStream | null>(null);
  const [videoSize, setVideoSize] = useState({ width: 0, height: 0 });
  
  // Initialize pose detection
  const posture = useStablePosture(true, sensitivity);
  const latestEye = useRef<number | null>(null);
  
  // Update latestEye when posture.eyeY changes
  useEffect(() => {
    if (posture.eyeY !== null) {
      latestEye.current = posture.eyeY;
    }
  }, [posture.eyeY]);
  
  // Initialize webcam once
  useEffect(() => {
    if (!cameraEnabled) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      return;
    }

    const setupCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'user' }, 
          audio: false 
        });
        
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          
          // Initialize video dimensions
          videoRef.current.addEventListener('loadedmetadata', () => {
            if (videoRef.current) {
              setVideoSize({
                width: videoRef.current.videoWidth,
                height: videoRef.current.videoHeight
              });
              
              // Start posture detection once video is loaded
              posture.startDetection();
            }
          });
        }
      } catch (err) {
        console.error('Failed to access webcam:', err);
        if (err instanceof Error) {
          // setError(err.message);
        } else {
          // setError('Failed to access webcam');
        }
      }
    };
    
    if (!streamRef.current) {
      setupCamera();
    }
    
    // Cleanup on unmount
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, [cameraEnabled, posture]);
  
  // Report posture changes to parent component (only when session is active)
  useEffect(() => {
    if (isSessionActive) {
      onPostureChange(posture.good);
    }
  }, [posture.good, isSessionActive, onPostureChange]);

  return (
    <div className="bg-gray-800 text-white p-3 rounded-lg shadow-lg max-w-md mx-auto">

      <h2 className="text-xl font-semibold mb-3 flex items-center">
        Posture Monitor 
        {posture.isActive && (posture.good ? '✅' : '❌')}
      </h2>
      <div className="relative mb-2">

        <PostureView /> 
        {posture.isActive && (
          <PoseLandmarksRenderer 
            landmarks={posture.landmarks} 
            width={videoSize.width} 
            height={videoSize.height}
            neckAngle={0}
            torsoAngle={0}
            isGoodPosture={posture.good}
          />
        )}
        {/* Add the eye-line guide overlay */}
        {posture.isActive && (
          <PoseOverlay
            width={videoSize.width}
            height={videoSize.height}
            good={posture.good}
            baselineEye={posture.baselineEye}
            currentEye={latestEye.current}
          />
        )}
        {posture.isActive && (
          <div className="absolute top-2 left-2 p-1 px-2 rounded bg-black/50 text-white text-[10px] z-10">
            Posture: {posture.isActive ? (posture.good ? 'Good ✅' : 'Bad ❌') : 'Off'}<br />
            {posture.baselineEye !== null && latestEye.current !== null && 
              `Eye Pos: ${((latestEye.current - posture.baselineEye) * videoSize.height).toFixed(1)}px`}
          </div>
        )}
        
        {/* Camera controls moved to top-right and made smaller */}
        {posture.isActive && (
          <div className="absolute top-2 right-2 flex gap-2 text-[10px] z-20">
            <button
              onClick={posture.toggleActive}
              className={`px-2 py-1 rounded-md font-semibold ${
                posture.isActive 
                  ? 'bg-blue-500/80 hover:bg-blue-600 text-white' 
                  : 'bg-gray-500/80 hover:bg-gray-600 text-white'
              }`}
              title="Toggle posture tracking"
            >
              {posture.isActive ? 'On' : 'Off'}
            </button>
            <button
              onClick={posture.calibrate}
              className="bg-gray-700/80 hover:bg-gray-600 text-white px-2 py-1 rounded-md font-semibold"
              title="Recalibrate baseline"
            >
              Calibrate
            </button>
          </div>
        )}

      </div>
      <PostureStatusDisplay /> 
      <PostureControls />      
    </div>
  );
};

// Wrap the component in React.memo to prevent unnecessary re-renders
export const PostureTracker = React.memo(PostureTrackerComponent); 