import React, { useRef, useEffect } from "react";
import { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { usePosture } from "@/context/PostureContext";
import { POSE_LANDMARKS } from "@/utils/postureDetect";
import PostureControls from './PostureControls';
import { BaselineMetrics, usePostureStore } from "@/store/postureSlice";

// Connection lines commented out as per request
/*
const POSE_CONNECTIONS: [number, number][] = [
  // ... (connections were here)
];
*/

export interface PostureViewProps {
  isSessionActive?: boolean;
  onPostureChange?: (isGood: boolean) => void;
}

interface CanvasOverlayProps { 
    videoElement: HTMLVideoElement | null;
    isGoodPosture: boolean;
    isCalibrated: boolean;
}

const CanvasOverlay: React.FC<CanvasOverlayProps> = ({
  videoElement,
  isGoodPosture,
  isCalibrated,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Refs for fast-changing data
  const landmarksRef = useRef<NormalizedLandmark[] | null>(null);
  const baselineRef = useRef<BaselineMetrics | null>(null);

  // Initialize refs and subscribe to store updates (single listener)
  useEffect(() => {
    // Seed initial values
    const init = usePostureStore.getState();
    baselineRef.current = init.baselineMetrics ?? null;
    landmarksRef.current = init.rawLandmarks ?? null;

    const unsub = usePostureStore.subscribe((state: ReturnType<typeof usePostureStore.getState>, prev: ReturnType<typeof usePostureStore.getState>) => {
      if (state.baselineMetrics !== prev.baselineMetrics) {
        baselineRef.current = state.baselineMetrics ?? null;
      }
      if (state.rawLandmarks !== prev.rawLandmarks) {
        landmarksRef.current = state.rawLandmarks ?? null;
      }
    });
    return unsub;
  }, []);

  // rAF drawing loop using refs
  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoElement;
    if (!canvas || !video) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let rafId: number | null = null;

    const resizeToVideo = () => {
      // Mirror canvas to video element dimensions & position
      const targetW = video.videoWidth || video.clientWidth || 640;
      const targetH = video.videoHeight || video.clientHeight || 480;
      canvas.width = targetW;
      canvas.height = targetH;
      canvas.style.width = `${video.clientWidth}px`;
      canvas.style.height = `${video.clientHeight}px`;
      canvas.style.left = `${video.offsetLeft}px`;
      canvas.style.top = `${video.offsetTop}px`;
    };

    const draw = () => {
      resizeToVideo();
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw horizontal baseline bar using stored baseline
      const bm = baselineRef.current;
      if (isCalibrated && bm && typeof bm.noseY === 'number') {
        const baselineNoseCanvasY = bm.noseY * canvas.height;
        const barHeight = 10;
        const barColor = isGoodPosture ? "rgba(0, 255, 0, 0.5)" : "rgba(255, 0, 0, 0.5)";
        ctx.fillStyle = barColor;
        ctx.fillRect(0, baselineNoseCanvasY - barHeight / 2, canvas.width, barHeight);
      }

      // Draw KEY landmark dots (keep visuals exactly as before)
      const landmarks = landmarksRef.current;
      if (landmarks && landmarks.length > 0) {
        ctx.save();
        const keyLandmarks = [
          POSE_LANDMARKS.NOSE,
          POSE_LANDMARKS.LEFT_EYE,
          POSE_LANDMARKS.RIGHT_EYE,
          POSE_LANDMARKS.LEFT_EAR,
          POSE_LANDMARKS.RIGHT_EAR,
          POSE_LANDMARKS.LEFT_SHOULDER,
          POSE_LANDMARKS.RIGHT_SHOULDER,
        ];

        landmarks.forEach((landmark, index) => {
          if (
            keyLandmarks.includes(index) &&
            landmark &&
            landmark.visibility &&
            landmark.visibility > 0.5 &&
            typeof landmark.x === 'number' &&
            typeof landmark.y === 'number'
          ) {
            ctx.beginPath();
            ctx.arc(
              (1 - landmark.x) * canvas.width, // Mirror X exactly as before
              landmark.y * canvas.height,
              5,
              0,
              Math.PI * 2
            );
            ctx.fillStyle = isGoodPosture
              ? "rgba(144, 238, 144, 0.8)"
              : "rgba(255, 182, 193, 0.8)";
            ctx.fill();
          }
        });
        ctx.restore();
      }

      rafId = requestAnimationFrame(draw);
    };

    rafId = requestAnimationFrame(draw);
    return () => { if (rafId) cancelAnimationFrame(rafId); };
  }, [videoElement, isCalibrated, isGoodPosture]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        left: videoElement?.offsetLeft ?? 0,
        top: videoElement?.offsetTop ?? 0,
        zIndex: 10,
      }}
    />
  );
};

export const PostureView: React.FC<PostureViewProps> = ({ isSessionActive, onPostureChange }) => {
  const {
    videoRef,
    detectedLandmarks,
    postureStatus,
    isCalibrated,
    handleCalibration,
    isLoadingDetector,
    cameraError,
    isCalibrating,
    countdown
  } = usePosture();

  useEffect(() => {
    if (isSessionActive && onPostureChange) {
      onPostureChange(postureStatus.isGood);
    }
  }, [postureStatus.isGood, isSessionActive, onPostureChange]);

  // Add UI Debug Log for Status
  console.count("PostureView render");
  // console.log("UI RENDER: PostureView received postureStatus:", postureStatus); 

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden max-w-[640px] mx-auto">
      <div className="p-4 pb-2 flex justify-between items-center">
        <h2 className="text-lg text-gray-800 dark:text-white">
          Posture Tracker
        </h2>
        <div className="flex space-x-2">
          <button 
            onClick={handleCalibration} 
            disabled={!detectedLandmarks || detectedLandmarks.length === 0 || isLoadingDetector || !!cameraError || isCalibrating} 
            className="bg-deep-purple-600 text-white hover:bg-deep-purple-700 dark:bg-deep-purple-700 dark:hover:bg-deep-purple-800 px-3 py-1 rounded font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCalibrating ? `Calibrating (${countdown ?? ''}...)` : "Calibrate"} 
          </button>
        </div>
      </div>
      
      <div className="relative w-full bg-black">
        {isLoadingDetector && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 z-20">
            <div className="text-white text-lg">Loading posture detector...</div>
          </div>
        )}
        
        {cameraError && !isLoadingDetector && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-900/20 z-20">
            <div className="text-white bg-red-900/80 p-4 rounded-lg max-w-md">
              <h3 className="text-lg font-bold mb-2">Camera Error</h3>
              <p>{cameraError}</p>
            </div>
          </div>
        )}

        <video
          ref={videoRef}
          autoPlay
          playsInline 
          muted 
          style={{ 
            transform: "scaleX(-1)", 
            display: 'block', 
            width: '100%',
            height: 'auto',
            objectFit: 'contain' 
          }}
          className=""
        />
        
        {videoRef.current && !cameraError && (
          <CanvasOverlay
            videoElement={videoRef.current}
            isGoodPosture={postureStatus.isGood}
            isCalibrated={isCalibrated}
          />
        )}
        
        { !isLoadingDetector && !cameraError && detectedLandmarks && detectedLandmarks.length > 0 && (
          <div className="absolute top-2 right-2 p-1 px-2 rounded bg-black/60 text-white text-xs font-medium z-10">
            {isCalibrating && countdown !== null ? 
              <span>Calibrating... {countdown}</span> : 
              <span>
                {(() => {
                    const msg = postureStatus.message;
                    console.log("UI RENDER - Rendering status message:", msg);
                    return `${postureStatus.isGood ? 'Good' : 'Bad'} | ${msg}`;
                })()}
              </span>
            }
          </div>
        )}
      </div>
      <PostureControls />
    </div>
  );
};

export default PostureView; 