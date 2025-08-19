import { useEffect, useMemo, type FC } from 'react';
import { useWarpStore } from '../../store/warpSlice';
import { 
  WARP_MODE, 
  STARFIELD_QUALITY,
  EXPERIMENT_LIGHT_SPEED
} from '../../constants';
import InlineCollapsibleCard from '../ui/InlineCollapsibleCard';
import { useInlineMinimize } from '../../hooks/useInlineMinimize';

 

export const StarfieldControls: FC = () => {
  const {
    warpMode,
    speedMultiplier,
    starfieldQuality,
    lightSpeedFullscreen,
    setWarpMode,
    setSpeedMultiplier,
    setStarfieldQuality,
    setLightSpeedFullscreen
  } = useWarpStore();

  // Inline collapse persisted via useInlineMinimize
  const { collapsed, toggle } = useInlineMinimize('environment', false);

  // handleWarpModeChange removed (unused)

  // Handle speed multiplier change (0.1 to 1.0)
  const handleSpeedMultiplierChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // UI slider is 10–100; normalize to 0–100 for mapping
    const uiValue = parseFloat(e.target.value);
    const sliderValue = Math.min(100, Math.max(0, ((uiValue - 10) / 90) * 100));
    
    // Convert slider value (0-100) to multiplier (0.1-1.0)
    // Use a non-linear mapping for better control
    let multiplier;
    
    if (sliderValue <= 30) {
      // Lower range (0-30%) maps to 0.1-0.4 (30% of range)
      multiplier = 0.1 + (sliderValue / 30) * 0.3;
    } else if (sliderValue <= 70) {
      // Mid range (30-70%) maps to 0.4-0.7 (30% of range)
      const normalizedValue = (sliderValue - 30) / 40;
      multiplier = 0.4 + normalizedValue * 0.3;
    } else {
      // Upper range (70-100%) maps to 0.7-1.0 (30% of range)
      // Use exponential curve for finer control at higher speeds
      const normalizedValue = (sliderValue - 70) / 30;
      multiplier = 0.7 + Math.pow(normalizedValue, 1.5) * 0.3;
    }
    
    // Round to 2 decimal places
    const roundedMultiplier = Math.round(multiplier * 100) / 100;
    
    // Update speed multiplier in store
    setSpeedMultiplier(roundedMultiplier);
  };

  // Convert multiplier back to slider value
  const multiplierToSliderValue = (multiplier: number) => {
    // Ensure multiplier is within range
    const clampedMultiplier = Math.max(0.1, Math.min(1.0, multiplier));
    
    // Inverse mapping
    let sliderValue;
    
    if (clampedMultiplier <= 0.4) {
      // Inverse of lower range
      sliderValue = ((clampedMultiplier - 0.1) / 0.3) * 30;
    } else if (clampedMultiplier <= 0.7) {
      // Inverse of mid range
      sliderValue = 30 + ((clampedMultiplier - 0.4) / 0.3) * 40;
    } else {
      // Inverse of upper range with exponential curve
      const normalizedValue = (clampedMultiplier - 0.7) / 0.3;
      sliderValue = 70 + Math.pow(normalizedValue, 1/1.5) * 30;
    }
    
    return Math.min(100, Math.max(0, sliderValue));
  };

  // Handle starfield quality change
  const handleQualityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const quality = e.target.value as typeof STARFIELD_QUALITY[keyof typeof STARFIELD_QUALITY];
    setStarfieldQuality(quality);
  };
  // (UI header labels removed; no longer shown in subtitle)

  const speedPercent = useMemo(() => Math.max(10, Math.round(speedMultiplier * 100)), [speedMultiplier]);

  // Overlay active when FULL warp, or LS with fullscreen toggle
  const overlayActive = warpMode === WARP_MODE.FULL || (warpMode === WARP_MODE.LIGHT_SPEED && !!lightSpeedFullscreen);

  // Fullscreen toggle reusing existing per-mode logic
  const toggleFullscreen = () => {
    if (warpMode === WARP_MODE.NONE) return;
    if (warpMode === WARP_MODE.LIGHT_SPEED) {
      setLightSpeedFullscreen(!lightSpeedFullscreen);
    } else if (warpMode === WARP_MODE.BACKGROUND) {
      setWarpMode(WARP_MODE.FULL);
    } else if (warpMode === WARP_MODE.FULL) {
      setWarpMode(WARP_MODE.BACKGROUND);
    }
  };

  // Keyboard shortcuts: F toggles fullscreen, M toggles collapse (W handled globally in App)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const k = e.key.toLowerCase();
      if (k === 'f') {
        e.preventDefault();
        toggleFullscreen();
      } else if (k === 'm') {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [warpMode, lightSpeedFullscreen, toggle]);

  // Segmented control helpers
  const selectOff = () => setWarpMode(WARP_MODE.NONE);
  const selectSpaceX = () => setWarpMode(WARP_MODE.BACKGROUND);
  const selectLightSpeed = () => setWarpMode(WARP_MODE.LIGHT_SPEED);

  // UI
  return (
    <InlineCollapsibleCard
      id="environment"
      title="Environment"
      helpTitle="Shortcuts: W cycle • F fullscreen • M collapse"
      onHelpClick={() => {}}
      canFullscreen={warpMode !== WARP_MODE.NONE}
      fullscreenActive={overlayActive}
      onToggleFullscreen={toggleFullscreen}
      collapsed={collapsed}
      onToggleCollapse={toggle}
      variant="v2"
      className="panel--no-pad panel-no-rail panel-hover"
      contentClassName="content-pad space-y-4"
    >
      {/* Mode segmented control */}
      <div role="tablist" aria-label="Environment mode" className="grid grid-cols-3 gap-1 rounded-lg p-1 bg-white/30 dark:bg-gray-700/50">
        {/* Off */}
        <button
          role="tab"
          aria-selected={warpMode === WARP_MODE.NONE}
          onClick={selectOff}
          className={`w-full px-3 py-2 rounded-md text-xs font-medium focus:outline-none focus:ring-2 focus:ring-violet-500 ${
            warpMode === WARP_MODE.NONE
              ? 'bg-violet-600 text-white'
              : 'bg-transparent text-gray-800 dark:text-gray-200 hover:bg-white/40 dark:hover:bg-gray-600'
          }`}
        >
          Off
        </button>
        {/* SpaceX */}
        <button
          role="tab"
          aria-selected={warpMode === WARP_MODE.BACKGROUND || warpMode === WARP_MODE.FULL}
          onClick={selectSpaceX}
          className={`w-full px-3 py-2 rounded-md text-xs font-medium focus:outline-none focus:ring-2 focus:ring-violet-500 ${
            warpMode === WARP_MODE.BACKGROUND || warpMode === WARP_MODE.FULL
              ? 'bg-violet-600 text-white'
              : 'bg-transparent text-gray-800 dark:text-gray-200 hover:bg-white/40 dark:hover:bg-gray-600'
          }`}
        >
          SpaceX
        </button>
        {/* Light Speed (gated) */}
        {EXPERIMENT_LIGHT_SPEED && (
          <button
            role="tab"
            aria-selected={warpMode === WARP_MODE.LIGHT_SPEED}
            onClick={selectLightSpeed}
            className={`w-full px-3 py-2 rounded-md text-xs font-medium focus:outline-none focus:ring-2 focus:ring-violet-500 ${
              warpMode === WARP_MODE.LIGHT_SPEED
                ? 'light-speed-btn ls-active bg-violet-600 text-white'
                : 'bg-transparent text-gray-800 dark:text-gray-200 hover:bg-white/40 dark:hover:bg-gray-600'
            }`}
          >
            Light Speed
          </button>
        )}
        {!EXPERIMENT_LIGHT_SPEED && (
          <div className="w-full" aria-hidden="true"></div>
        )}
      </div>

      {/* Speed */}
      <div>
        <div className="flex items-center justify-between">
          <label className="text-sm text-gray-700 dark:text-gray-300" htmlFor="env-speed">Speed</label>
          <span className="text-sm tabular-nums text-gray-700 dark:text-gray-300">{speedPercent}%</span>
        </div>
        <input
          id="env-speed"
          type="range"
          min={10}
          max={100}
          step={1}
          value={Math.round(10 + multiplierToSliderValue(speedMultiplier) * 0.9)}
          onChange={handleSpeedMultiplierChange}
          disabled={warpMode === WARP_MODE.NONE}
          className="star-slider w-full h-2 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
          aria-valuemin={10}
          aria-valuemax={100}
          aria-valuenow={speedPercent}
        />
        <div className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">10 | 50 | 100</div>
      </div>

      {/* Quality */}
      <div>
        <label className="text-sm text-gray-700 dark:text-gray-300" htmlFor="env-quality">Quality</label>
        <select
          id="env-quality"
          value={starfieldQuality === STARFIELD_QUALITY.OFF ? STARFIELD_QUALITY.ECO : starfieldQuality}
          onChange={handleQualityChange}
          disabled={warpMode === WARP_MODE.NONE}
          className="mt-1 w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-50"
          aria-label="Starfield quality"
        >
          <option value={STARFIELD_QUALITY.ECO}>Eco</option>
          <option value={STARFIELD_QUALITY.STANDARD}>Balanced</option>
          <option value={STARFIELD_QUALITY.ULTRA}>Ultra</option>
        </select>
      </div>

      {/* Footer shortcuts */}
      <div className="pt-1 text-xs text-gray-500 dark:text-gray-400">W: cycle • F: fullscreen • M: collapse</div>
    </InlineCollapsibleCard>
  );
};