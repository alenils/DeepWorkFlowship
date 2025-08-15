import React from 'react';
import { usePosture } from '@/context/PostureContext';

const PostureControls: React.FC = () => {
  const {
    // Camera toggle and calibration are handled in PostureView's top-right controls
    isCalibrating,
    isLoadingDetector,
    sensitivityPercentage,
    setSensitivityPercentage,
  } = usePosture();

  return (
    <div className="flex flex-col items-center space-y-4 mt-4 pb-2">
      {/* Sensitivity Slider */}
      <div className="w-full max-w-xs px-4 sm:px-0">
        <label
          htmlFor="sensitivity"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 text-center"
        >
          Sensitivity ({sensitivityPercentage}%)
        </label>
        <input
          type="range"
          id="sensitivity"
          min="5"
          max="30"
          step="1"
          value={sensitivityPercentage}
          onChange={(e) => setSensitivityPercentage(Number(e.target.value))}
          className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-deep-purple-600 dark:accent-deep-purple-500"
          disabled={isCalibrating || isLoadingDetector}
        />
      </div>
    </div>
  );
};

export default PostureControls;