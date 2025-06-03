import { useState, useEffect, useRef } from 'react';
import { useStablePosture } from '../hooks/useStablePosture';
import { PoseLandmarksRenderer } from './PoseLandmarksRenderer';
import { PoseOverlay } from './PoseOverlay';
import { STORAGE_KEYS, FOCUS_STATEMENTS } from '../constants';

export const CameraPlaceholder = ({ isSessionActive = false, onPostureChange = (_: boolean) => {} }) => {
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [currentCaption, setCurrentCaption] = useState('');
  const [videoSize, setVideoSize] = useState({ width: 0, height: 0 });
  const [sensitivityFactor, setSensitivityFactor] = useState<number>(() => {
    // Load sensitivity from localStorage, default to 1.0 (which means 10° neck threshold, 8° torso threshold)
    const storedValue = localStorage.getItem(STORAGE_KEYS.POSTURE_SENSITIVITY);
    return storedValue ? parseFloat(storedValue) : 1.0;
  });
  
  // Initialize pose detection with sensitivityFactor
  const posture = useStablePosture(true, sensitivityFactor);
  const latestEye = useRef<number | null>(null);
  
  // Update latestEye when posture.eyeY changes
  useEffect(() => {
    if (posture.eyeY !== null) {
      latestEye.current = posture.eyeY;
    }
  }, [posture.eyeY]);
  
  // Set a random caption when session starts
  useEffect(() => {
    if (isSessionActive && cameraEnabled) {
      const randomIndex = Math.floor(Math.random() * FOCUS_STATEMENTS.length);
      setCurrentCaption(FOCUS_STATEMENTS[randomIndex]);
    } else if (!isSessionActive) {
      setCurrentCaption('');
    }
  }, [isSessionActive, cameraEnabled]);
  
  // Initialize webcam when cameraEnabled changes
  useEffect(() => {
    if (cameraEnabled) {
      // The video reference is now managed by PostureContext
      // Start detection through the hook, which delegates to PostureContext
      posture.startDetection().then(() => {
        // Get video element through PostureContext's videoRef
        const videoElement = document.querySelector('video[autoplay][playsInline][muted]') as HTMLVideoElement;
        if (videoElement) {
          // Update video dimensions for rendering overlays
          videoElement.addEventListener('loadedmetadata', () => {
            setVideoSize({
              width: videoElement.videoWidth,
              height: videoElement.videoHeight
            });
          });
        }
      }).catch(err => {
        console.error('Failed to start posture detection:', err);
      });
    } else {
      // Stop detection through the hook, which delegates to PostureContext
      posture.stopDetection();
    }
    
    // No need to clean up MediaStream as that's handled by PostureContext
  }, [cameraEnabled, posture]);
  
  // Report posture changes to parent component (only when session is active)
  useEffect(() => {
    if (isSessionActive) {
      onPostureChange(posture.good);
    }
  }, [posture.good, isSessionActive, onPostureChange]);

  // Toggle camera
  const toggleCamera = () => {
    setCameraEnabled(prev => !prev);
  };
  
  // Handle sensitivity change
  const handleSensitivityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = parseFloat(e.target.value);
    setSensitivityFactor(value);
    localStorage.setItem(STORAGE_KEYS.POSTURE_SENSITIVITY, value.toString());
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden w-full lg:w-[125%] lg:-mr-[25%]">
      <div className="p-4 pb-2 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
          🎥 Posture Tracker {posture.isActive && (posture.good ? '✅' : '❌')}
        </h2>
        <div className="flex space-x-2">
          <select
            value={sensitivityFactor.toString()}
            onChange={handleSensitivityChange}
            className="px-2 py-1 rounded font-semibold text-sm bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white"
            title="Adjust sensitivity of posture detection"
          >
            <option value="0.5">5°/4° (High)</option>
            <option value="1.0">10°/8° (Normal)</option>
            <option value="1.5">15°/12° (Medium)</option>
            <option value="2.0">20°/16° (Low)</option>
          </select>
          <button
            onClick={toggleCamera}
            className={`px-3 py-1 rounded font-semibold transition-opacity ${
              cameraEnabled 
                ? 'bg-red-600 hover:bg-red-700 text-white dark:opacity-90 dark:hover:opacity-100' 
                : 'bg-green-500 text-white hover:bg-green-600'
            }`}
          >
            {cameraEnabled ? 'TURN OFF' : 'TURN ON'}
          </button>
        </div>
      </div>
      
      <div className="relative aspect-video bg-black h-auto lg:h-[125%]">
        {!cameraEnabled ? (
          <div className="absolute inset-0 flex items-center justify-center p-6 bg-gray-900">
            <p className="text-white text-center text-lg font-semibold">
              Camera Off
            </p>
          </div>
        ) : (
          <>
            {/* No need to render a video element here as it's managed by PostureContext */}
            {/* The landmarks and overlays still work, but now based on the store state */}
            {posture.landmarks && (
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
            <PoseOverlay
              width={videoSize.width}
              height={videoSize.height}
              good={posture.good}
              baselineEye={posture.baselineEye}
              currentEye={latestEye.current}
            />
            {currentCaption && (
              <div className="absolute bottom-14 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 flex justify-center">
                <p className="text-white text-xs italic opacity-90 font-medium text-center">
                  {currentCaption}
                </p>
              </div>
            )}
            <div className="absolute top-2 right-2 p-2 rounded bg-black/50 text-white text-xs">
              Posture: {posture.isActive ? (posture.good ? 'Good ✅' : 'Bad ❌') : 'Off'}<br />
              {posture.baselineEye !== null && latestEye.current !== null && 
                `Eye Pos: ${((latestEye.current - posture.baselineEye) * videoSize.height).toFixed(1)}px`}
            </div>
            
            {/* Always visible camera controls */}
            <div className="absolute bottom-3 inset-x-0 flex justify-center gap-4 text-xs">
              <button
                onClick={posture.toggleActive}
                className={`px-3 py-1 rounded font-semibold ${
                  posture.isActive 
                    ? 'bg-blue-500/80 hover:bg-blue-600 text-white' 
                    : 'bg-gray-500/80 hover:bg-gray-600 text-white'
                }`}
              >
                {posture.isActive ? 'Posture ON' : 'Posture OFF'}
              </button>
              <button
                onClick={posture.calibrate}
                className="bg-gray-700/80 hover:bg-gray-600 text-white px-3 py-1 rounded font-semibold"
              >
                Calibrate
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}; 