import { useWarpStore } from '../../store/warpSlice';
import { 
  WARP_MODE, 
  STARFIELD_QUALITY, 
  STARFIELD_QUALITY_LABELS,
  STAR_COUNTS_BY_QUALITY
} from '../../constants';

export const StarfieldControls: React.FC = () => {
  const {
    warpMode,
    warpSpeed,
    starfieldQuality,
    setWarpMode,
    setWarpSpeed,
    setStarfieldQuality
  } = useWarpStore();

  // Handle warp mode change
  const handleWarpModeChange = (mode: typeof WARP_MODE[keyof typeof WARP_MODE]) => {
    setWarpMode(mode);
  };

  // Handle warp speed change
  const handleWarpSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSpeed = parseFloat(e.target.value);
    setWarpSpeed(newSpeed);
  };

  // Handle starfield quality change
  const handleQualityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const quality = e.target.value as typeof STARFIELD_QUALITY[keyof typeof STARFIELD_QUALITY];
    setStarfieldQuality(quality);
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
            <span className="text-sm text-gray-700 dark:text-gray-300">{warpSpeed.toFixed(1)}x</span>
          </div>
          <input
            type="range"
            min="0.1"
            max="3.0"
            step="0.1"
            value={warpSpeed}
            onChange={handleWarpSpeedChange}
            disabled={warpMode === WARP_MODE.NONE}
            className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
          />
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