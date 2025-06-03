/**
 * This is a compatibility wrapper that re-exports the usePosture hook
 * from the PostureContext. This helps maintain backward compatibility
 * with existing components using this import path.
 */

import { usePosture } from '@/context/PostureContext';

export { usePosture }; 