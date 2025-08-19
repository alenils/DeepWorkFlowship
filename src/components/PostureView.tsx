import React, { useRef, useEffect, useCallback } from "react";
import { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { usePosture } from "@/context/PostureContext";
import { POSE_LANDMARKS } from "@/utils/postureDetect";
import PostureControls from './PostureControls';
import { BaselineMetrics, usePostureStore } from "@/store/postureSlice";
import InlineCollapsibleCard from './ui/InlineCollapsibleCard';
import { useInlineMinimize } from '../hooks/useInlineMinimize';

/**
 * PostureView.tsx
 *
 * Responsibilities:
 * - UI/layout and slow-changing posture UI state only (calibration, status chip, errors, controls)
 * - Does NOT render fast-changing pose data; that is delegated to CanvasOverlay using refs + rAF
 */
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

/**
 * CanvasOverlay
 * High-frequency draw loop that paints pose landmarks using:
 * - Zustand subscribe -> refs for fast updates without React renders
 * - requestAnimationFrame for smooth drawing
 * Cleans up rAF and subscriptions on unmount.
 */
const CanvasOverlay: React.FC<CanvasOverlayProps> = ({
  videoElement,
  isGoodPosture,
  isCalibrated,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Refs for fast-changing data
  const landmarksRef = useRef<NormalizedLandmark[] | null>(null);
  const baselineRef = useRef<BaselineMetrics | null>(null);

  // Dev-only lightweight frame counter
  const DEBUG_CANVAS = import.meta.env.DEV && false;

  // Initialize refs and subscribe to store updates (single listener without selector middleware)
  useEffect(() => {
    // Seed initial values
    const init = usePostureStore.getState();
    baselineRef.current = init.baselineMetrics ?? null;
    landmarksRef.current = init.rawLandmarks ?? null;

    let prev = init;
    const unsub = usePostureStore.subscribe((state) => {
      if (state.baselineMetrics !== prev.baselineMetrics) {
        baselineRef.current = state.baselineMetrics ?? null;
      }
      if (state.rawLandmarks !== prev.rawLandmarks) {
        landmarksRef.current = state.rawLandmarks ?? null;
      }
      prev = state;
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

    // Cache last applied measurements to avoid redundant DOM writes
    let prevW = -1, prevH = -1;
    let prevClientW = -1, prevClientH = -1;
    let prevLeft = -1, prevTop = -1;

    const resizeToVideo = () => {
      // Mirror canvas to video element dimensions & position
      const targetW = video.videoWidth || video.clientWidth || 640;
      const targetH = video.videoHeight || video.clientHeight || 480;
      if (targetW !== prevW) { canvas.width = targetW; prevW = targetW; }
      if (targetH !== prevH) { canvas.height = targetH; prevH = targetH; }

      const cw = video.clientWidth;
      const ch = video.clientHeight;
      if (cw !== prevClientW) { canvas.style.width = `${cw}px`; prevClientW = cw; }
      if (ch !== prevClientH) { canvas.style.height = `${ch}px`; prevClientH = ch; }

      const l = video.offsetLeft;
      const t = video.offsetTop;
      if (l !== prevLeft) { canvas.style.left = `${l}px`; prevLeft = l; }
      if (t !== prevTop) { canvas.style.top = `${t}px`; prevTop = t; }
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

      if (DEBUG_CANVAS) console.count("CanvasOverlay draw frame");
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
  const { videoRef, handleCalibration, startPostureDetection, stopPostureDetection } = usePosture();
  const { collapsed, toggle } = useInlineMinimize('posture-tracker', false);

  const DEV = import.meta?.env?.DEV ?? false;
  const renderCountRef = useRef(0);
  renderCountRef.current += 1;
  const wasDetectingRef = useRef(false);

  // Select only slow-changing UI fields individually (avoids equality typing issues)
  const isCalibrated = usePostureStore((s) => s.isCalibrated);
  const cameraError = usePostureStore((s) => s.cameraError);
  const postureStatus = usePostureStore((s) => s.postureStatus);
  const isLoadingDetector = usePostureStore((s) => s.isLoadingDetector);
  const isCalibrating = usePostureStore((s) => s.isCalibrating);
  const countdown = usePostureStore((s) => s.countdown);
  const isDetecting = usePostureStore((s) => s.isDetecting);

  const handleToggleDetection = useCallback(() => {
    if (isDetecting) {
      stopPostureDetection();
    } else {
      startPostureDetection();
    }
  }, [isDetecting, startPostureDetection, stopPostureDetection]);

  useEffect(() => {
    if (isSessionActive && onPostureChange) {
      onPostureChange(postureStatus.isGood);
    }
  }, [postureStatus.isGood, isSessionActive, onPostureChange]);

  // Pause posture detection when tab hidden, resume if it was active before when visible again
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'hidden') {
        wasDetectingRef.current = usePostureStore.getState().isDetecting;
        if (wasDetectingRef.current) {
          if (DEV) console.debug('[PostureView] Pausing detection (tab hidden)');
          stopPostureDetection();
        }
      } else {
        if (wasDetectingRef.current) {
          if (DEV) console.debug('[PostureView] Resuming detection (tab visible)');
          startPostureDetection();
        }
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [startPostureDetection, stopPostureDetection, DEV]);

  // Add UI Debug Log for Status (DEV only)
  if (DEV) console.debug('PostureView render:', renderCountRef.current);

  return (
    <InlineCollapsibleCard
      id="posture-tracker"
      title="Posture Tracker"
      helpTitle="M: collapse"
      onHelpClick={() => {}}
      variant="v2"
      headerRight={
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleDetection}
            disabled={isLoadingDetector || !!cameraError || isCalibrating}
            className={`relative h-8 w-8 flex items-center justify-center rounded-md border border-white/15 bg-white/40 dark:bg-gray-700/60 hover:bg-white/60 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isDetecting ? 'text-green-400' : 'text-gray-300'}`}
            title={isDetecting ? 'Turn OFF camera' : 'Turn ON camera'}
            aria-label={isDetecting ? 'Turn OFF camera' : 'Turn ON camera'}
            aria-pressed={isDetecting}
          >
            <span aria-hidden="true" className="text-base">📷</span>
            <span
              aria-hidden="true"
              className={`absolute top-0.5 right-0.5 w-2 h-2 rounded-full ${isDetecting ? 'bg-green-500' : 'bg-gray-400/70'}`}
            />
          </button>

          <button
            onClick={handleCalibration}
            disabled={isLoadingDetector || !!cameraError || isCalibrating || !isDetecting}
            className="px-3 py-1 rounded font-semibold text-sm bg-white/80 dark:bg-gray-800/60 text-gray-800 dark:text-gray-100 border border-deep-purple-500/30 hover:border-deep-purple-500/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title={!isDetecting ? 'Start camera to calibrate' : 'Recalibrate baseline'}
          >
            {isCalibrating ? `Calibrating (${countdown ?? ''}...)` : 'Calibrate'}
          </button>
        </div>
      }
      collapsed={collapsed}
      onToggleCollapse={toggle}
      className="panel--no-pad panel-no-rail overflow-hidden panel-hover"
      contentClassName="content-pad"
    >
      {/* Controls moved to headerRight */}

      <div className="relative w-full bg-black rounded-md border border-white/10 overflow-hidden">
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
        
        {videoRef.current && !cameraError && isDetecting && (
          <CanvasOverlay
            videoElement={videoRef.current}
            isGoodPosture={postureStatus.isGood}
            isCalibrated={isCalibrated}
          />
        )}
        
        { !isLoadingDetector && !cameraError && (
          <div className="absolute top-2 left-2 p-1 px-2 rounded bg-black/60 text-white text-[10px] font-medium z-10">
            {isCalibrating && countdown !== null ? 
              <span>Calibrating... {countdown}</span> : 
              <span>
                {(() => {
                    const msg = postureStatus.message;
                    if (DEV) console.debug('UI RENDER - Rendering status message:', msg);
                    return `${postureStatus.isGood ? 'Good' : 'Bad'} | ${msg}`;
                })()}
              </span>
            }
          </div>
        )}
      </div>
      <PostureControls />
    </InlineCollapsibleCard>
  );
};

export default React.memo(PostureView);