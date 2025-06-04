import { useWarpStore } from '../../store/warpSlice';
import { 
  WARP_MODE, 
  STARFIELD_QUALITY, 
  STARFIELD_QUALITY_LABELS,
  STAR_COUNTS_BY_QUALITY,
  WARP_ANIMATION
} from '../../constants';

export const StarfieldControls: React.FC = () => {
  const {
    warpMode,
    warpSpeed,
    starfieldQuality,
    setWarpMode,
    setWarpSpeed,
    setStarfieldQuality,
    updateEffectiveSpeed
  } = useWarpStore();

  // Handle warp mode change
  const handleWarpModeChange = (mode: typeof WARP_MODE[keyof typeof WARP_MODE]) => {
    setWarpMode(mode);
  };

  // Handle warp speed change with more intuitive mapping for better control
  const handleWarpSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Get slider value (0-100)
    const sliderValue = parseFloat(e.target.value);
    
    // Apply a custom non-linear mapping for more natural and perceivable speed changes
    // Lower end is more subtle and controllable, high end produces dramatic speed increases
    const minSpeed = 0.1;
    const maxSpeed = 5.0;
    
    // Use a hybrid curve with multiple components for optimal control across the range:
    // 1. Linear component for predictable low-end control (0-30%)
    // 2. Quadratic component for smooth mid-range acceleration (30-70%)
    // 3. Exponential component for dramatic high-end speeds (70-100%)
    let newSpeed;
    
    if (sliderValue <= 30) {
      // Linear for subtle changes at the lower end (0-30% of slider)
      const linearRange = maxSpeed * 0.2; // First 20% of the speed range
      newSpeed = minSpeed + (sliderValue / 30) * linearRange;
    } else if (sliderValue <= 70) {
      // Quadratic for middle range (30-70% of slider)
      const midPoint = minSpeed + maxSpeed * 0.2; // Starting from end of linear section
      const midRange = maxSpeed * 0.4; // Middle 40% of the speed range
      const normalized = (sliderValue - 30) / 40; // Normalize to 0-1 within this range
      newSpeed = midPoint + midRange * (normalized * normalized);
    } else {
      // Exponential for dramatic changes at the high end (70-100% of slider)
      const highStart = minSpeed + maxSpeed * 0.6; // Starting from end of quadratic section
      const highRange = maxSpeed * 0.4; // Final 40% of the speed range
      const normalized = (sliderValue - 70) / 30; // Normalize to 0-1 within this range
      // More aggressive exponential curve for high end
      newSpeed = highStart + highRange * (Math.exp(normalized * 2.5) - 1) / (Math.exp(2.5) - 1);
    }
    
    // Round to 1 decimal place for display
    const roundedSpeed = Math.round(newSpeed * 10) / 10;
    
    // Update store with new speed
    setWarpSpeed(roundedSpeed);
    
    // Update effective speed immediately for responsive feel
    updateEffectiveSpeed(true); // Pass true to ensure we get normal speed, not idle
  };

  // Convert warp speed back to slider value (inverse of the curve above)
  const speedToSliderValue = (speed: number) => {
    const minSpeed = 0.1;
    const maxSpeed = 5.0;
    
    // Normalize speed to 0-1 range
    const normalizedSpeed = Math.max(0, Math.min(1, (speed - minSpeed) / (maxSpeed - minSpeed)));
    let sliderValue;
    
    // Apply inverse of our curve segments
    if (normalizedSpeed <= 0.2) {
      // Inverse of linear section (first 20% of speed range)
      sliderValue = (normalizedSpeed / 0.2) * 30;
    } else if (normalizedSpeed <= 0.6) {
      // Inverse of quadratic section (middle 40% of speed range)
      const normalizedInRange = (normalizedSpeed - 0.2) / 0.4;
      sliderValue = 30 + 40 * Math.sqrt(normalizedInRange);
    } else {
      // Inverse of exponential section (final 40% of speed range)
      const normalizedInRange = (normalizedSpeed - 0.6) / 0.4;
      // Approximate inverse of exponential function
      sliderValue = 70 + 30 * (Math.log(normalizedInRange * (Math.exp(2.5) - 1) + 1) / 2.5);
    }
    
    return Math.min(100, Math.max(0, sliderValue));
  };

  // Handle starfield quality change
  const handleQualityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const quality = e.target.value as typeof STARFIELD_QUALITY[keyof typeof STARFIELD_QUALITY];
    setStarfieldQuality(quality);
  };

  // Get descriptive speed label with enhanced feedback
  const getSpeedLabel = (speed: number) => {
    if (speed >= 4.5) {
      return `${speed.toFixed(1)}x (Hyperspace)`;
    } else if (speed >= 3.0) {
      return `${speed.toFixed(1)}x (Warp)`;  
    } else if (speed >= WARP_ANIMATION.MIN_SPEED_FOR_STREAKS) {
      return `${speed.toFixed(1)}x (Streaking)`;
    } else if (speed <= 0.2) {
      return `${speed.toFixed(1)}x (Crawl)`;
    }
    return `${speed.toFixed(1)}x`;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Starfield Controls</h3>
      
      <div className="space-y-4">
        {/* Warp Mode Selection */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleWarpModeChange(WARP_MODE.NONE)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              warpMode === WARP_MODE.NONE
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            No Warp
          </button>
          <button
            onClick={() => handleWarpModeChange(WARP_MODE.BACKGROUND)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              warpMode === WARP_MODE.BACKGROUND
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Background Warp
          </button>
          <button
            onClick={() => handleWarpModeChange(WARP_MODE.FULL)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              warpMode === WARP_MODE.FULL
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Full Warp
          </button>
        </div>

        {/* Warp Speed Slider */}
        <div className="space-y-1">
          <div className="flex justify-between">
            <label className="text-sm text-gray-700 dark:text-gray-300">Warp Speed</label>
            <span className="text-sm text-gray-700 dark:text-gray-300">{getSpeedLabel(warpSpeed)}</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={speedToSliderValue(warpSpeed)}
            onChange={handleWarpSpeedChange}
            disabled={warpMode === WARP_MODE.NONE}
            className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
          />
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>Slow</span>
            <span>Fast</span>
          </div>
        </div>

        {/* Starfield Quality Selection */}
        <div className="space-y-1">
          <label className="text-sm text-gray-700 dark:text-gray-300">Starfield Quality</label>
          <select
            value={starfieldQuality}
            onChange={handleQualityChange}
            disabled={warpMode === WARP_MODE.NONE}
            className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
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
          <p>Press <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">W</kbd> to cycle through warp modes</p>
        </div>
      </div>
    </div>
  );
}; 