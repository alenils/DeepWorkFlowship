/**
 * This is a compatibility wrapper that re-exports the usePosture hook
 * from the PostureContext. This helps maintain backward compatibility
 * while we transition to the new centralized posture logic.
 */

import { usePosture } from '@/context/PostureContext';

export { usePosture }; 