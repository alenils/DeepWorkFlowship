import { useWarpStore } from '../../store/warpSlice';
import { 
  WARP_MODE, 
  STARFIELD_QUALITY, 
  STARFIELD_QUALITY_LABELS,
  STAR_COUNTS_BY_QUALITY,
  // LIGHT_SPEED_EXPERIMENT: flag controls exposure of LIGHT_SPEED mode
  EXPERIMENT_LIGHT_SPEED
} from '../../constants';
import PanelContainer from '../ui/PanelContainer';

// LIGHT_SPEED_EXPERIMENT: debug marker for sanity checks
console.log('[LIGHT_SPEED_EXPERIMENT] StarfieldControls.tsx loaded; EXPERIMENT_LIGHT_SPEED =', EXPERIMENT_LIGHT_SPEED);

export const StarfieldControls: React.FC = () => {
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



  // Handle warp mode change
  const handleWarpModeChange = (mode: typeof WARP_MODE[keyof typeof WARP_MODE]) => {
    setWarpMode(mode);
  };

  // Handle speed multiplier change (0.1 to 1.0)
  const handleSpeedMultiplierChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Get slider value (0-100)
    const sliderValue = parseFloat(e.target.value);
    
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

  // Get simplified speed label showing only percentage
  const getSpeedLabel = () => {
    // Show percentage of maximum speed based on multiplier
    const percentValue = Math.round(speedMultiplier * 100);
    return `${percentValue}%`;
  };

  return (
    <PanelContainer className="p-4 mb-4">
      <h3 className="text-lg text-gray-900 dark:text-white mb-3">Stars Settings</h3>
      
      <div className="space-y-4">
        {/* Warp Mode Selection */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleWarpModeChange(WARP_MODE.NONE)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              warpMode === WARP_MODE.NONE
                ? 'bg-deep-purple-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            No Warp
          </button>
          <button
            onClick={() => handleWarpModeChange(WARP_MODE.BACKGROUND)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              warpMode === WARP_MODE.BACKGROUND
                ? 'bg-deep-purple-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Background Warp
          </button>
          <button
            onClick={() => handleWarpModeChange(WARP_MODE.FULL)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              warpMode === WARP_MODE.FULL
                ? 'bg-deep-purple-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Full Warp
          </button>
          {/* LIGHT_SPEED_EXPERIMENT: gated LIGHT SPEED button */}
          {EXPERIMENT_LIGHT_SPEED && (
            <button
              onClick={() => handleWarpModeChange(WARP_MODE.LIGHT_SPEED)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors light-speed-btn ${
                warpMode === WARP_MODE.LIGHT_SPEED
                  ? 'bg-deep-purple-600 text-white ls-active'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
              title="Experimental light speed mode"
            >
              LIGHT SPEED
            </button>
          )}
        </div>

        {/* LIGHT SPEED Fullscreen toggle - only visible in LIGHT SPEED */}
        {EXPERIMENT_LIGHT_SPEED && warpMode === WARP_MODE.LIGHT_SPEED && (
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-700 dark:text-gray-300">Fullscreen</label>
            <input
              type="checkbox"
              checked={!!lightSpeedFullscreen}
              onChange={(e) => setLightSpeedFullscreen(e.target.checked)}
              disabled={false}
              title={''}
              className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-deep-purple-600 focus:ring-deep-purple-500 disabled:opacity-50"
            />
          </div>
        )}

        {/* Speed Multiplier Slider */}
        <div className="space-y-1">
          <div className="flex justify-between">
            <label className="text-sm text-gray-700 dark:text-gray-300">
              Speed
            </label>
            <span className="text-sm text-gray-700 dark:text-gray-300">{getSpeedLabel()}</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={multiplierToSliderValue(speedMultiplier)}
            onChange={handleSpeedMultiplierChange}
            disabled={warpMode === WARP_MODE.NONE}
            className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
          />
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>10%</span>
            <span>100%</span>
          </div>
        </div>

        {/* Starfield Quality Selection */}
        <div className="space-y-1">
          <label className="text-sm text-gray-700 dark:text-gray-300">Quality</label>
          <select
            value={starfieldQuality}
            onChange={handleQualityChange}
            disabled={warpMode === WARP_MODE.NONE}
            className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-deep-purple-500 focus:border-deep-purple-500 disabled:opacity-50"
          >
            {Object.entries(STARFIELD_QUALITY).map(([_, value]) => (
              <option key={value} value={value}>
                {STARFIELD_QUALITY_LABELS[value]} ({STAR_COUNTS_BY_QUALITY[value]} stars)
              </option>
            ))}
          </select>
        </div>

        {/* Keyboard Shortcuts Info */}
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          {EXPERIMENT_LIGHT_SPEED ? (
            <p>
              Press <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">W</kbd>
              {' '}to cycle: None → Background → Full → Light Speed
            </p>
          ) : (
            <p>
              Press <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">W</kbd>
              {' '}to cycle: None → Background → Full
            </p>
          )}
        </div>
      </div>
    </PanelContainer>
  );
};