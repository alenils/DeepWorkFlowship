import React from 'react';
import { useStablePosture } from '../hooks/useStablePosture';

/**
 * Displays the current posture status information
 */
const PostureStatusDisplay: React.FC = () => {
  const posture = useStablePosture();
  
  if (!posture.isActive) {
    return null;
  }
  
  return (
    <div className="bg-gray-700 p-2 rounded-md mb-2 text-sm">
      <div className="flex justify-between items-center">
        <span>Status:</span>
        <span className={`font-semibold ${posture.good ? 'text-green-400' : 'text-red-400'}`}>
          {posture.good ? 'Good Posture' : 'Poor Posture'}
        </span>
      </div>
      
      {posture.baselineEye !== null && (
        <div className="flex justify-between items-center mt-1">
          <span>Baseline:</span>
          <span>{posture.baselineEye.toFixed(2)}</span>
        </div>
      )}
      
      {posture.eyeY !== null && (
        <div className="flex justify-between items-center mt-1">
          <span>Current Position:</span>
          <span>{posture.eyeY.toFixed(2)}</span>
        </div>
      )}
      
      {posture.baselineEye !== null && posture.eyeY !== null && (
        <div className="flex justify-between items-center mt-1">
          <span>Deviation:</span>
          <span className={`${Math.abs(posture.eyeY - posture.baselineEye) > 0.04 ? 'text-red-400' : 'text-green-400'}`}>
            {((posture.eyeY - posture.baselineEye) * 100).toFixed(1)}%
          </span>
        </div>
      )}
    </div>
  );
};

export default PostureStatusDisplay; 