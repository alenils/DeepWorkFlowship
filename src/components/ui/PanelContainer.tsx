import React from 'react';

export interface PanelContainerProps extends React.HTMLAttributes<HTMLDivElement> { variant?: 'cockpit' | 'v2' | 'none'; }

/**
 * PanelContainer
 * Reusable wrapper that applies Flowship's premium glass cockpit styling.
 * - Uses existing .panel-glass tokens from theme.css for glassmorphism.
 * - Adds .panel-cockpit for 16px radius, subtle multi-layer glow, and micro-interactions.
 * - Does NOT enforce padding to preserve existing component spacing. Pass padding via className.
 */
export const PanelContainer: React.FC<PanelContainerProps> = ({
  variant = 'cockpit',
  className = '',
  children,
  ...rest
}) => {
  const baseClass = variant === 'v2' ? 'panel-v2' : variant === 'none' ? '' : 'panel-glass panel-cockpit';
  return (
    <div
      className={`${baseClass} ${className}`.trim()}
      {...rest}
    >
      {children}
    </div>
  );
};

export default PanelContainer;
